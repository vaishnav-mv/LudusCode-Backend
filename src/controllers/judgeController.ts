import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IJudgeService } from '../interfaces/services'
import { ExecuteDTO } from '../dto/request/judge.request.dto'
import { ApiResponse } from '../utils/ApiResponse'

@singleton()
export class JudgeController {
    constructor(
        @inject("IJudgeService") private _service: IJudgeService
    ) { }

    /**
     * @desc    Execute code against test cases
     * @route   POST /api/judge/execute
     * @req     body: { problemId, userCode, language, customInputs }
     * @res     { overallStatus, results, executionTime, memoryUsage }
     */
    execute = async (req: Request, res: Response) => {
        const body = req.body as ExecuteDTO
        const { problemId, userCode, language, customInputs } = body;

        try {
            const executionResult = await this._service.execute(problemId, userCode, language, customInputs);
            return ApiResponse.success(res, executionResult)
        } catch (e: unknown) {
            const msg = (e as Error).message;
            if (msg === "Problem not found") return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
            return ApiResponse.error(res, msg || "System Error", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
