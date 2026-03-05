import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { HttpStatus } from '../constants'
import { ISubmissionService } from '../interfaces/services'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from "../utils/asyncHandler";

@singleton()
export class SubmissionController {
    constructor(@inject("ISubmissionService") private _service: ISubmissionService) { }

    /**
     * @desc    Create a new submission
     * @route   POST /api/submissions
     * @req     body: { problemId, code, language, result }
     * @res     { submission }
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.sub;
        if (!userId) return ApiResponse.error(res, "Unauthorized", HttpStatus.UNAUTHORIZED)
        const { problemId, code, language, result } = req.body;
        if (!problemId || !code || !language || !result) {
                        return ApiResponse.error(res, "Missing required fields", HttpStatus.BAD_REQUEST)
                    }
        const submission = await this._service.createSubmission(userId, problemId, code, language, result);
        return ApiResponse.success(res, submission, "Submission created", HttpStatus.CREATED)
        })

    /**
     * @desc    Get submissions for a user
     * @route   GET /api/submissions/user/:userId
     * @req     params: { userId }
     * @res     [Submission]
     */
    getUserSubmissions = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId || req.user?.sub;
        if (!userId) return ApiResponse.error(res, "UserId required", HttpStatus.BAD_REQUEST)
        const submissions = await this._service.getUserSubmissions(userId);
        return ApiResponse.success(res, submissions)
        })

    /**
     * @desc    Get solved problem IDs for a user
     * @route   GET /api/submissions/user/:userId/solved
     * @req     params: { userId }
     * @res     [problemId]
     */
    getSolvedProblems = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.params.userId || req.user?.sub;
        if (!userId) return ApiResponse.error(res, "UserId required", HttpStatus.BAD_REQUEST)
        const solvedIds = await this._service.getSolvedProblemIds(userId);
        return ApiResponse.success(res, solvedIds)
        })
}
