import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { HttpStatus } from '../constants'
import { ISubmissionService } from '../interfaces/services'
import { getErrorMessage } from '../utils/errorUtils'
import { ApiResponse } from '../utils/ApiResponse'


@singleton()
export class SubmissionController {
    constructor(@inject("ISubmissionService") private _service: ISubmissionService) { }

    /**
     * @desc    Create a new submission
     * @route   POST /api/submissions
     * @req     body: { problemId, code, language, result }
     * @res     { submission }
     */
    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.sub;
            if (!userId) return ApiResponse.error(res, "Unauthorized", HttpStatus.UNAUTHORIZED)
            const { problemId, code, language, result } = req.body;
            // Validate input
            if (!problemId || !code || !language || !result) {
                return ApiResponse.error(res, "Missing required fields", HttpStatus.BAD_REQUEST)
            }

            const submission = await this._service.createSubmission(userId, problemId, code, language, result);
            return ApiResponse.success(res, submission, "Submission created", HttpStatus.CREATED)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    /**
     * @desc    Get submissions for a user
     * @route   GET /api/submissions/user/:userId
     * @req     params: { userId }
     * @res     [Submission]
     */
    getUserSubmissions = async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId || req.user?.sub;
            if (!userId) return ApiResponse.error(res, "UserId required", HttpStatus.BAD_REQUEST)
            const submissions = await this._service.getUserSubmissions(userId);
            return ApiResponse.success(res, submissions)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    /**
     * @desc    Get solved problem IDs for a user
     * @route   GET /api/submissions/user/:userId/solved
     * @req     params: { userId }
     * @res     [problemId]
     */
    getSolvedProblems = async (req: Request, res: Response) => {
        try {
            const userId = req.params.userId || req.user?.sub;
            if (!userId) return ApiResponse.error(res, "UserId required", HttpStatus.BAD_REQUEST)
            const solvedIds = await this._service.getSolvedProblemIds(userId);
            return ApiResponse.success(res, solvedIds)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
