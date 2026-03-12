import { singleton, inject } from 'tsyringe'
import { IStudySessionRepository, IGroupRepository } from '../interfaces/repositories'
import { StudySessionStatus, StudySession } from '../types'
import { broadcastSession } from '../realtime/ws'
import { IStudySessionService } from '../interfaces/services'
import { mapStudySession } from '../utils/mapper'
import { StudySessionResponseDTO } from '../dto/response/studySession.response.dto'

@singleton()
export class StudySessionService implements IStudySessionService {
    constructor(
        @inject("IStudySessionRepository") private _sessions: IStudySessionRepository,
        @inject("IGroupRepository") private _groups: IGroupRepository
    ) { }

    async create(data: { groupId: string, userId: string, title: string, description: string, startTime: string, durationMinutes: number }): Promise<StudySessionResponseDTO> {
        const userId = data.userId;

        const group = await this._groups.getById(data.groupId);
        if (!group) throw new Error("Group not found");

        // Verify membership (or ownership)
        const isMember = group.members.some(member => {
            const memberId = typeof member === 'string' ? member : member._id?.toString() || member.id!;
            return memberId === userId;
        }) || (typeof group.owner === 'string' ? group.owner : group.owner._id?.toString() || group.owner.id!) === userId;
        if (!isMember) throw new Error("Must be a group member to create a session");

        const sessionData = {
            groupId: data.groupId,
            createdBy: userId,
            title: data.title,
            description: data.description,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
            problems: [],
            status: new Date(data.startTime).getTime() > Date.now() ? StudySessionStatus.Upcoming : StudySessionStatus.Active
        };

        const session = await this._sessions.create(sessionData);
        return mapStudySession(session)!;
    }

    async update(sessionId: string, userId: string, data: Partial<StudySession>): Promise<StudySessionResponseDTO | null> {
        const resolvedUserId = userId;
        const session = await this._sessions.getById(sessionId);
        if (!session) throw new Error("Session not found");

        // Check ownership
        if (session.createdBy.toString() !== resolvedUserId) {
            const isParticipant = session.participants.some(participant => {
                const pUserId = typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!;
                return pUserId === resolvedUserId;
            });
            if (!isParticipant) {
                throw new Error("You must be a participant to update this session");
            }
        }

        const updated = await this._sessions.update(sessionId, data);
        if (updated) broadcastSession(sessionId, updated);
        return updated ? mapStudySession(updated) : null;
    }

    async join(sessionId: string, userId: string): Promise<StudySessionResponseDTO | null> {
        const resolvedUserId = userId;
        const session = await this._sessions.getById(sessionId);
        if (!session) throw new Error("Session not found");

        // Verify group membership
        const group = await this._groups.getById(session.groupId.toString());
        if (!group) throw new Error("Group not found");

        const isMember = group.members.find(member => {
            const memberId = typeof member === 'string' ? member : member._id?.toString() || member.id!;
            return memberId === resolvedUserId;
        }) || (typeof group.owner === 'string' ? group.owner : group.owner._id?.toString() || group.owner.id!) === resolvedUserId;

        if (!isMember) {
            throw new Error("You must be a member of the group to join this session");
        }

        const exists = session.participants.find(participant => {
            const participantId = typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!;
            return participantId === resolvedUserId;
        });

        if (exists) {
            return mapStudySession(session)!; // Already joined
        }

        // Prepare new list, normalizing existing populated users back to IDs
        const newParticipants = session.participants.map(participant => ({
            ...participant,
            user: typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!
        }));

        newParticipants.push({
            user: resolvedUserId,
            joinedAt: new Date(),
            role: 'participant'
        });

        const updated = await this._sessions.update(sessionId, { participants: newParticipants });
        if (updated) broadcastSession(sessionId, updated);
        return updated ? mapStudySession(updated) : null;
    }

    async leave(sessionId: string, userId: string): Promise<StudySessionResponseDTO | null> {
        const resolvedUserId = userId;
        const session = await this._sessions.getById(sessionId);
        if (!session) return null;

        // Filter out the user, handling both populated and unpopulated states
        const filteredParticipants = session.participants.filter(participant => {
            const participantId = typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!;
            return participantId !== resolvedUserId;
        });

        // Normalize for save
        const saveParticipants = filteredParticipants.map(participant => ({
            ...participant,
            user: typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!
        }));

        const updated = await this._sessions.update(sessionId, { participants: saveParticipants });
        if (updated) broadcastSession(sessionId, updated);
        return updated ? mapStudySession(updated) : null;
    }

    async list(groupId: string, page: number = 1, limit: number = 20, options: { status?: string, sort?: string, query?: string } = {}): Promise<{ sessions: StudySessionResponseDTO[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const { sessions, total } = await this._sessions.listByGroup(groupId, skip, limit, options);

        // Update statuses dynamically
        const now = Date.now();
        const updatedSessions = await Promise.all(sessions.map(async (session: StudySession) => {
            const start = new Date(session.startTime).getTime();
            const end = start + session.durationMinutes * 60 * 1000;
            let statusChanged = false;

            if (session.status !== StudySessionStatus.Completed && now > end) {
                session.status = StudySessionStatus.Completed;
                statusChanged = true;
            } else if (session.status === StudySessionStatus.Upcoming && now >= start && now <= end) {
                session.status = StudySessionStatus.Active;
                statusChanged = true;
            }

            if (statusChanged) {
                await this._sessions.update(session._id!, { status: session.status });
            }
            return session;
        }));

        return {
            sessions: updatedSessions.map(session => mapStudySession(session)).filter((session): session is StudySessionResponseDTO => session !== null),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getById(id: string): Promise<StudySessionResponseDTO | null> {
        const session = await this._sessions.getById(id);
        return session ? mapStudySession(session) : null;
    }

    async getByIdSecure(id: string, userId: string): Promise<StudySessionResponseDTO | null> {
        const resolvedUserId = userId;
        const session = await this._sessions.getById(id);
        if (!session) return null;

        // Verify group membership for READ access
        const group = await this._groups.getById(session.groupId.toString());
        if (!group) return null; // Or throw error

        const isMember = group.members.some(member => {
            const memberId = typeof member === 'string' ? member : member._id?.toString() || member.id!;
            return memberId === resolvedUserId;
        }) || (typeof group.owner === 'string' ? group.owner : group.owner._id?.toString() || group.owner.id!) === resolvedUserId;

        if (!isMember) {
            throw new Error("You are not authorized to view this session");
        }

        return mapStudySession(session);
    }
}
