import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IProblemService } from '../interfaces/services'
import { GenerateProblemDTO } from '../dto/request/problem.request.dto'
import { asyncHandler } from "../utils/asyncHandler";
import logger from '../utils/logger';

@singleton()
export class ProblemController {
    constructor(@inject("IProblemService") private _service: IProblemService) { }

    /**
     * @desc    Get approved problems
     * @route   GET /api/problems/approved
     * @req     -
     * @res     [Problem]
     */
    approvedProblems = asyncHandler(async (req: Request, res: Response) => {
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
        logger.debug(`[ProblemController] Approved problems count: ${result.data.length} of ${result.total}`);
        return ApiResponse.success(res, result);
    })

    /**
     * @desc    Get daily problem
     * @route   GET /api/problems/daily
     * @req     -
     * @res     { problem }
     */
    dailyProblem = asyncHandler(async (req: Request, res: Response) => {
        const problem = await this._service.daily();
        if (!problem) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, problem)
    })

    /**
     * @desc    Generate a new problem using AI
     * @route   POST /api/problems/generate
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as GenerateProblemDTO
        const { difficulty, topic } = body;
        const problem = await this._service.generate(difficulty, topic);
        return ApiResponse.success(res, problem)
    })

    /**
     * @desc    Create a new problem
     * @route   POST /api/problems
     * @req     body: { title, description, difficulty, tags, testCases, solution }
     * @res     { problem }
     */
    createProblem = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user;
        let status = 'Custom';
        if (user && user.isAdmin && req.body.status === 'Approved') {
            status = 'Approved';
        }
        if (user && user.isAdmin && req.body.status === 'Pending') {
            status = 'Pending';
        }
        const problemData = { ...req.body, status };
        const problem = await this._service.create(problemData);
        return ApiResponse.success(res, problem, 'Problem created', HttpStatus.CREATED)
    })

    /**
     * @desc    Update a problem
     * @route   PUT /api/problems/:id
     * @req     body: { ...updates }
     * @res     { problem }
     */
    updateProblem = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updates = req.body;
        const updated = await this._service.update(id, updates);
        if (!updated) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, updated, 'Problem updated')
    })
}
