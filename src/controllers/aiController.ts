import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IAiService } from '../interfaces/services'


import { HintDTO, CodeReviewDTO, PerformanceDTO } from '../dto/request/ai.request.dto'
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
        } catch (e: unknown) {
            const msg = getErrorMessage(e);
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
        } catch (e: unknown) {
            const msg = getErrorMessage(e);
            if (msg === "User not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
            return ApiResponse.error(res, msg, HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Get AI explanation for a concept
     * @route   POST /api/ai/explain-concept
     * @req     body: { concept }
     * @res     { explanation }
     */
    explainConcept = async (req: Request, res: Response) => {
        try {
            const { concept } = req.body;
            const explanation = await this._service.explainConcept(concept);
            return ApiResponse.success(res, { explanation })
        } catch (e: unknown) {
            return ApiResponse.error(res, getErrorMessage(e), HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Summarize a chat discussion
     * @route   POST /api/ai/summarize-discussion
     * @req     body: { messages }
     * @res     { summary }
     */
    summarizeDiscussion = async (req: Request, res: Response) => {
        try {
            const { messages } = req.body;
            const summary = await this._service.summarizeDiscussion(messages);
            return ApiResponse.success(res, { summary })
        } catch (e: unknown) {
            return ApiResponse.error(res, getErrorMessage(e), HttpStatus.NOT_IMPLEMENTED)
        }
    }

    /**
     * @desc    Generate a problem using AI
     * @route   POST /api/ai/generate-problem
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = async (req: Request, res: Response) => {
        try {
            const { difficulty, topic } = req.body;
            const problem = await this._service.generateProblem(difficulty, topic);
            return ApiResponse.success(res, problem)
        } catch (e: unknown) {
            return ApiResponse.error(res, getErrorMessage(e), HttpStatus.NOT_IMPLEMENTED)
        }
    }
}
