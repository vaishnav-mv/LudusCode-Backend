import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { IJudgeService } from '../interfaces/services'
import { ExecuteDTO } from '../dto/request/judge.request.dto'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from "../utils/asyncHandler";

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
    execute = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as ExecuteDTO
        const { problemId, userCode, language, customInputs } = body;
        const executionResult = await this._service.execute(problemId, userCode, language, customInputs);
        return ApiResponse.success(res, executionResult)
        })
}
