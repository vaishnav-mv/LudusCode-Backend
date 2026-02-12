import { singleton } from 'tsyringe'
import { ISubmissionRepository } from '../interfaces/repositories'
import { Model } from 'mongoose'
import { SubmissionModel } from '../models/Submission'
import { ProblemSubmission } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class SubmissionRepository extends BaseRepository<ProblemSubmission> implements ISubmissionRepository {
    constructor() {
        super(SubmissionModel as unknown as Model<ProblemSubmission>)
    }

    async create(data: Partial<ProblemSubmission>): Promise<ProblemSubmission> {
        let submission = await this.model.create(data);
        submission = await submission.populate('problemId');
        return submission.toObject();
    }

    async findByUser(userId: string, limit: number = 20): Promise<ProblemSubmission[]> {
        return await this.model.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('problemId')
            .lean();
    }

    async getSolvedProblemIds(userId: string): Promise<string[]> {
        const solved = await this.model.find({
            userId,
            status: 'Accepted'
        }).distinct('problemId');
        return solved.map(id => id.toString());
    }
}
