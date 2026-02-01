import { singleton } from 'tsyringe'
import { StudySessionModel } from '../models/StudySession'
import { StudySession, StudySessionStatus } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class StudySessionRepository extends BaseRepository<StudySession> {
    constructor() {
        super(StudySessionModel)
    }

    // Create inherited (Base is sufficient if no populate needed immediately, original had no populate)

    async getById(id: string) {
        const session = await this.model.findById(id)
            .populate('participants.user')
            .populate('problems')
            .lean();
        return this.mapDoc(session);
    }

    async update(id: string, data: any) {
        const session = await this.model.findByIdAndUpdate(id, { $set: data }, { new: true })
            .populate('participants.user')
            .populate('problems')
            .lean();
        return this.mapDoc(session);
    }

    async listByGroup(groupId: string, skip: number, limit: number, options: { status?: string, sort?: string, q?: string } = {}) {
        const query: any = { groupId };

        if (options.status) {
            query.status = options.status;
        }

        if (options.q) {
            query.title = { $regex: options.q, $options: 'i' };
        }

        let sort: any = { startTime: -1 };
        if (options.sort === 'oldest') {
            sort = { startTime: 1 };
        } else if (options.sort === 'startTime') {
            sort = { startTime: -1 };
        }

        const sessions = await this.model.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('participants.user')
            .lean();
        return sessions.map((s: any) => this.mapDoc(s)!);
    }

    // Delete inherited

    async findActiveRoundRobin() {
        // Find sessions that are Active, Mode=RoundRobin
        const sessions = await this.model.find({
            status: StudySessionStatus.Active,
            mode: 'round_robin'
        }).lean();
        return sessions.map((s: any) => this.mapDoc(s)!);
    }
}
