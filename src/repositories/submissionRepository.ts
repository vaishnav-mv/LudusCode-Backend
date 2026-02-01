import { singleton } from 'tsyringe'
import { ISubmissionRepository } from '../interfaces/repositories'
import { SubmissionModel } from '../models/Submission'
import { Submission } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class SubmissionRepository extends BaseRepository<Submission> implements ISubmissionRepository {
    constructor() {
        super(SubmissionModel)
    }

    async create(data: any) {
        let submission = await this.model.create(data);
        submission = await submission.populate('problemId');
        const s = submission.toObject();

        return {
            id: s._id.toString(),
            problem: { ...s.problemId, id: s.problemId?._id.toString() },
            userCode: s.code,
            result: {
                overallStatus: s.status,
                results: s.testCaseResults,
                executionTime: s.executionTime,
                memoryUsage: s.memoryUsage
            },
            submittedAt: s.createdAt
        } as any;
    }

    async findByUser(userId: string, limit: number = 20) {
        const submissions = await this.model.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('problemId')
            .lean();

        return submissions.map((s: any) => ({
            id: s._id.toString(),
            problem: { ...s.problemId, id: s.problemId?._id.toString() },
            userCode: s.code,
            result: {
                overallStatus: s.status,
                results: s.testCaseResults,
                executionTime: s.executionTime,
                memoryUsage: s.memoryUsage
            },
            submittedAt: s.createdAt
        }));
    }

    async getSolvedProblemIds(userId: string) {
        const solved = await this.model.find({
            userId,
            status: 'Accepted'
        }).distinct('problemId');
        return solved.map(id => id.toString());
    }
}
