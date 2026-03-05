import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { IAiService } from '../interfaces/services'
import { HintDTO, CodeReviewDTO, PerformanceDTO, ComplexityDTO } from '../dto/request/ai.request.dto'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from "../utils/asyncHandler";

@singleton()
export class AiController {
    constructor(
        @inject("IAiService") private _service: IAiService
    ) { }

    /**
     * @desc    Get AI hint for a problem
     * @route   POST /api/ai/hint
     * @req     body: { problemId, userCode }
     * @res     { hint }
     */
    hint = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as HintDTO
        const { problemId, userCode } = body;
        const hintText = await this._service.hint(problemId, userCode);
        return ApiResponse.success(res, { hint: hintText })
    })

    /**
     * @desc    Get AI code review
     * @route   POST /api/ai/code-review
     * @req     body: { problemId, userCode }
     * @res     { review }
     */
    codeReview = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as CodeReviewDTO
        const { problemId, userCode } = body;
        const review = await this._service.codeReview(problemId, userCode);
        return ApiResponse.success(res, { review: review })
    })

    /**
     * @desc    Get AI performance analysis
     * @route   POST /api/ai/performance
     * @req     body: { userId }
     * @res     { analysis }
     */
    performance = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as PerformanceDTO
        const { userId } = body;
        const analysis = await this._service.performance(userId);
        return ApiResponse.success(res, { analysis })
    })

    /**
     * @desc    Generate problem
     * @route   POST /api/ai/generate-problem
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = asyncHandler(async (req: Request, res: Response) => {
        const { difficulty, topic } = req.body;
        const problem = await this._service.generateProblem(difficulty, topic);
        return ApiResponse.success(res, { problem })
    })

    /**
     * @desc    Get live code complexity (Premium feature)
     * @route   POST /api/ai/live-complexity
     * @req     body: { userCode }
     * @res     { complexity }
     */
    liveComplexity = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as ComplexityDTO;
        const complexityJSON = await this._service.complexity(body.userCode);
        const complexity = JSON.parse(complexityJSON);
        return ApiResponse.success(res, { complexity });
    })

    /**
     * @desc    Get AI code optimization (Premium feature)
     * @route   POST /api/ai/optimize
     * @req     body: { problemId, userCode }
     * @res     { optimization }
     */
    optimize = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as CodeReviewDTO;
        const { problemId, userCode } = body;
        const optimizationJSON = await this._service.optimize(problemId, userCode);
        return ApiResponse.success(res, { optimization: JSON.parse(optimizationJSON) });
    })

    /**
     * @desc    Get AI edge cases analysis (Premium feature)
     * @route   POST /api/ai/edge-cases
     * @req     body: { problemId, userCode }
     * @res     { edgeCases }
     */
    edgeCases = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as CodeReviewDTO;
        const { problemId, userCode } = body;
        const edgeCasesJSON = await this._service.edgeCases(problemId, userCode);
        return ApiResponse.success(res, { edgeCases: JSON.parse(edgeCasesJSON) });
    })
}
