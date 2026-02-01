import { singleton, inject } from 'tsyringe'
import { ISubmissionRepository } from '../interfaces/repositories'

@singleton()
export class SubmissionService {
    constructor(@inject("ISubmissionRepository") private _submissionRepo: ISubmissionRepository) { }

    async createSubmission(userId: string, problemId: string, code: string, language: string, result: any) {
        // Map execution result to submission status
        const status = result.overallStatus;

        return await this._submissionRepo.create({
            userId,
            problemId,
            code,
            language,
            status,
            executionTime: result.executionTime,
            memoryUsage: result.memoryUsage,
            testCaseResults: result.results
        });
    }

    async getUserSubmissions(userId: string) {
        return await this._submissionRepo.findByUser(userId);
    }

    async getSolvedProblemIds(userId: string) {
        return await this._submissionRepo.getSolvedProblemIds(userId);
    }
}
