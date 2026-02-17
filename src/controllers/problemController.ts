import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IProblemService } from '../interfaces/services'
import { GenerateProblemDTO } from '../dto/request/problem.request.dto'
import { getErrorMessage } from '../utils/errorUtils'

@singleton()
export class ProblemController {
    constructor(@inject("IProblemService") private _service: IProblemService) { }

    /**
     * @desc    Get approved problems
     * @route   GET /api/problems/approved
     * @req     -
     * @res     [Problem]
     */
    approvedProblems = async (req: Request, res: Response) => {
        const { q, sort, difficulty, tags, page, limit } = req.query;
        const result = await this._service.list({
            query: q as string,
            sort: sort as string,
            difficulty: difficulty as string,
            tags: tags as string,
            status: 'Approved',
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined
        });
        console.log(`[ProblemController] Approved problems count: ${result.data.length} of ${result.total}`);
        return ApiResponse.success(res, result)
    }

    /**
     * @desc    Get daily problem
     * @route   GET /api/problems/daily
     * @req     -
     * @res     { problem }
     */
    dailyProblem = async (req: Request, res: Response) => {
        const problem = await this._service.daily();
        if (!problem) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, problem)
    }

    /**
     * @desc    Generate a new problem using AI
     * @route   POST /api/problems/generate
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = async (req: Request, res: Response) => {
        try {
            const body = req.body as GenerateProblemDTO
            const { difficulty, topic } = body;
            const problem = await this._service.generate(difficulty, topic);
            return ApiResponse.success(res, problem)
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            // Parse Google AI API errors for user-friendly messages
            if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
                return ApiResponse.error(res, 'AI rate limit exceeded. Please wait a moment and try again.', HttpStatus.TOO_MANY_REQUESTS);
            }
            if (msg.includes('NOT_FOUND') || msg.includes('not found for API version')) {
                return ApiResponse.error(res, 'The AI model is currently unavailable. Please try again later.', HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (msg.includes('PERMISSION_DENIED') || msg.includes('API key')) {
                return ApiResponse.error(res, 'AI service is not properly configured. Please contact the administrator.', HttpStatus.FORBIDDEN);
            }
            return ApiResponse.error(res, 'Failed to generate problem. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @desc    Create a new problem
     * @route   POST /api/problems
     * @req     body: { title, description, difficulty, tags, testCases, solution }
     * @res     { problem }
     */
    createProblem = async (req: Request, res: Response) => {
        try {
            const user = req.user;
            let status = 'Custom';
            if (user && user.isAdmin && req.body.status === 'Approved') {
                status = 'Approved';
            }
            // Allow manual "Pending" also if we want
            if (user && user.isAdmin && req.body.status === 'Pending') {
                status = 'Pending';
            }
            const problemData = { ...req.body, status };
            const problem = await this._service.create(problemData);
            return ApiResponse.success(res, problem, 'Problem created', HttpStatus.CREATED)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Update a problem
     * @route   PUT /api/problems/:id
     * @req     body: { ...updates }
     * @res     { problem }
     */
    updateProblem = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updated = await this._service.update(id, updates);
            if (!updated) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
            return ApiResponse.success(res, updated, 'Problem updated')
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }
}
