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
        const submissionObj = submission.toObject();

        return {
            id: submissionObj._id.toString(),
            problem: { ...submissionObj.problemId, id: submissionObj.problemId?._id.toString() },
            userCode: submissionObj.code,
            result: {
                overallStatus: submissionObj.status,
                results: submissionObj.testCaseResults,
                executionTime: submissionObj.executionTime,
                memoryUsage: submissionObj.memoryUsage
            },
            submittedAt: submissionObj.createdAt
        } as any;
    }

    async findByUser(userId: string, limit: number = 20) {
        const submissions = await this.model.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('problemId')
            .lean();

        return submissions.map((submission: any) => ({
            id: submission._id.toString(),
            problem: { ...submission.problemId, id: submission.problemId?._id.toString() },
            userCode: submission.code,
            result: {
                overallStatus: submission.status,
                results: submission.testCaseResults,
                executionTime: submission.executionTime,
                memoryUsage: submission.memoryUsage
            },
            submittedAt: submission.createdAt
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
