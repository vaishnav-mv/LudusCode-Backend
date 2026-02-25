import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IAiService } from '../interfaces/services'


import { HintDTO, CodeReviewDTO, PerformanceDTO, ComplexityDTO } from '../dto/request/ai.request.dto'
import { getErrorMessage } from '../utils/errorUtils'
import { ApiResponse } from '../utils/ApiResponse'

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
    hint = async (req: Request, res: Response) => {
        try {
            const body = req.body as HintDTO
            const { problemId, userCode } = body;
            const hintText = await this._service.hint(problemId, userCode);
            return ApiResponse.success(res, { hint: hintText })
        } catch (e: unknown) {
            const msg = getErrorMessage(e);
            if (msg === "Problem not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
            return ApiResponse.error(res, msg, HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Get AI code review
     * @route   POST /api/ai/code-review
     * @req     body: { problemId, userCode }
     * @res     { review }
     */
    codeReview = async (req: Request, res: Response) => {
        try {
            const body = req.body as CodeReviewDTO
            const { problemId, userCode } = body;
            const review = await this._service.codeReview(problemId, userCode);
            return ApiResponse.success(res, { review: review })
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg === "Problem not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
            return ApiResponse.error(res, msg, HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Get AI performance analysis
     * @route   POST /api/ai/performance
     * @req     body: { userId }
     * @res     { analysis }
     */
    performance = async (req: Request, res: Response) => {
        try {
            const body = req.body as PerformanceDTO
            const { userId } = body;
            const analysis = await this._service.performance(userId);
            return ApiResponse.success(res, { analysis })
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg === "User not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
            return ApiResponse.error(res, msg, HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Generate problem
     * @route   POST /api/ai/generate-problem
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = async (req: Request, res: Response) => {
        try {
            const { difficulty, topic } = req.body;
            const problem = await this._service.generateProblem(difficulty, topic);
            return ApiResponse.success(res, { problem })
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            return ApiResponse.error(res, msg, HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    /**
     * @desc    Get live code complexity (Premium feature)
     * @route   POST /api/ai/live-complexity
     * @req     body: { userCode }
     * @res     { complexity }
     */
    liveComplexity = async (req: Request, res: Response) => {
        try {
            const body = req.body as ComplexityDTO;
            const complexityJSON = await this._service.complexity(body.userCode);
            // Returns a JSON string from Gemini, parse it before sending
            const complexity = JSON.parse(complexityJSON);
            return ApiResponse.success(res, { complexity });
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            return ApiResponse.error(res, msg, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @desc    Get AI code optimization (Premium feature)
     * @route   POST /api/ai/optimize
     * @req     body: { problemId, userCode }
     * @res     { optimization }
     */
    optimize = async (req: Request, res: Response) => {
        try {
            const body = req.body as CodeReviewDTO;
            const { problemId, userCode } = body;
            const optimizationJSON = await this._service.optimize(problemId, userCode);
            return ApiResponse.success(res, { optimization: JSON.parse(optimizationJSON) });
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg === "Problem not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
            return ApiResponse.error(res, msg, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * @desc    Get AI edge cases analysis (Premium feature)
     * @route   POST /api/ai/edge-cases
     * @req     body: { problemId, userCode }
     * @res     { edgeCases }
     */
    edgeCases = async (req: Request, res: Response) => {
        try {
            const body = req.body as CodeReviewDTO;
            const { problemId, userCode } = body;
            const edgeCasesJSON = await this._service.edgeCases(problemId, userCode);
            return ApiResponse.success(res, { edgeCases: JSON.parse(edgeCasesJSON) });
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg === "Problem not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
            return ApiResponse.error(res, msg, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
