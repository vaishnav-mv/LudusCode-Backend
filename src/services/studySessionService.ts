import { singleton, inject } from 'tsyringe'
import { IStudySessionRepository, IUserRepository, IGroupRepository } from '../interfaces/repositories'
import { StudySessionMode, StudySessionStatus, StudySession, Group, User } from '../types'
import { broadcastSession } from '../realtime/ws'

import { IStudySessionService } from '../interfaces/services'

@singleton()
export class StudySessionService implements IStudySessionService {
    constructor(
        @inject("IStudySessionRepository") private _sessions: IStudySessionRepository,
        @inject("IUserRepository") private _users: IUserRepository,
        @inject("IGroupRepository") private _groups: IGroupRepository
    ) { }

    async create(data: { groupId: string, userId: string, title: string, description: string, mode: string, startTime: string, durationMinutes: number, problems: string[] }) {
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
            mode: data.mode as StudySessionMode,
            startTime: data.startTime,
            durationMinutes: data.durationMinutes,
            problems: data.problems,
            status: new Date(data.startTime).getTime() > Date.now() ? StudySessionStatus.Upcoming : StudySessionStatus.Active
        };

        const session = await this._sessions.create(sessionData);
        return session;
    }

    async update(sessionId: string, userId: string, data: Partial<StudySession>) {
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
        return updated || null;
    }

    async join(sessionId: string, userId: string) {
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
            return session; // Already joined
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
        return updated || null;
    }

    async leave(sessionId: string, userId: string) {
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
        return updated || null;
    }

    async passTurn(sessionId: string, userId: string) {
        const resolvedUserId = userId;
        const session = await this._sessions.getById(sessionId);
        if (!session) throw new Error("Session not found");

        if (session.mode !== 'round_robin') throw new Error("Pass Turn is only available in Round Robin mode");

        const participants = session.participants.map(participant => typeof participant.user === 'string' ? participant.user : participant.user._id?.toString() || participant.user.id!);
        if (participants.length === 0) return session;

        let currentIndex = -1;

        // If no turn is set, or the turn user is not in participants anymore
        if (!session.currentTurnUserId || !participants.includes(session.currentTurnUserId.toString())) {
            // Default to next should be 0 (first user)
            currentIndex = -1; // so next will be 0
        } else {
            if (session.currentTurnUserId.toString() !== resolvedUserId) {
                if (session.currentTurnUserId) throw new Error("It is not your turn");
            }
            currentIndex = participants.indexOf(resolvedUserId);
        }

        const nextIndex = (currentIndex + 1) % participants.length;
        const nextUserId = participants[nextIndex];

        const updated = await this._sessions.update(sessionId, {
            currentTurnUserId: nextUserId,
            turnStartedAt: new Date()
        });
        if (updated) broadcastSession(sessionId, updated);
        return updated || null;
    }

    async checkRoundRobinTimers() {
        const sessions = await this._sessions.findActiveRoundRobin();
        const now = Date.now();

        for (const session of sessions) {
            // Default turn duration 5 minutes if not set
            const turnDurationMs = (session.turnDurationSeconds || 300) * 1000;

            if (!session.turnStartedAt) {
                // Initialize turn start if missing
                await this._sessions.update(session._id!, { turnStartedAt: new Date() });
                continue;
            }

            const elapsed = now - new Date(session.turnStartedAt).getTime();
            if (elapsed >= turnDurationMs) {
                // Time's up -> Pass Turn
                try {
                    await this.passTurn(session._id!, (session.currentTurnUserId || '').toString());
                } catch (e) {
                    console.error(`Failed to auto-pass turn for session ${session._id}`, e);
                }
            }
        }
    }

    async list(groupId: string, page: number = 1, limit: number = 20, options: { status?: string, sort?: string, q?: string } = {}) {
        const skip = (page - 1) * limit;
        const sessions = await this._sessions.listByGroup(groupId, skip, limit, options);

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

        return updatedSessions;
    }

    async getById(id: string) {
        const session = await this._sessions.getById(id);
        return session || null;
    }

    async getByIdSecure(id: string, userId: string) {
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

        return session;
    }
}
