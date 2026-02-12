import { singleton, inject } from 'tsyringe'
import { ISubmissionRepository } from '../interfaces/repositories'

import { ISubmissionService } from '../interfaces/services'
import { SubmissionResult } from '../types'
import { mapSubmission } from '../utils/mapper'

@singleton()
export class SubmissionService implements ISubmissionService {
    constructor(@inject("ISubmissionRepository") private _submissionRepo: ISubmissionRepository) { }

    async createSubmission(userId: string, problemId: string, code: string, language: string, result: SubmissionResult) {
        // Map execution result to submission status
        const status = result.overallStatus;

        const submission = await this._submissionRepo.create({
            userId,
            problemId,
            code,
            language,
            status,
            executionTime: result.executionTime,
            memoryUsage: result.memoryUsage,
            testCaseResults: result.results
        });
        return mapSubmission(submission);
    }

    async getUserSubmissions(userId: string) {
        const submissions = await this._submissionRepo.findByUser(userId);
        return submissions.map(mapSubmission);
    }

    async getSolvedProblemIds(userId: string) {
        return await this._submissionRepo.getSolvedProblemIds(userId);
    }
}
