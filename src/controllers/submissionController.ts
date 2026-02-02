import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { HttpStatus } from '../constants'
import { ISubmissionService } from '../interfaces/services'


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
            const userId = (req as any).user.sub;
            const { problemId, code, language, result } = req.body;
            // Validate input
            if (!problemId || !code || !language || !result) {
                return res.status(HttpStatus.BAD_REQUEST).json({ message: "Missing required fields" });
            }

            const submission = await this._service.createSubmission(userId, problemId, code, language, result);
            res.status(HttpStatus.CREATED).json(submission);
        } catch (error: any) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Failed to create submission' });
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
            const userId = req.params.userId || (req as any).user.sub;
            const submissions = await this._service.getUserSubmissions(userId);
            res.json(submissions);
        } catch (error: any) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Failed to fetch submissions' });
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
            const userId = req.params.userId || (req as any).user.sub;
            const solvedIds = await this._service.getSolvedProblemIds(userId);
            res.json(solvedIds);
        } catch (error: any) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Failed to fetch solved problems' });
        }
    }
}
