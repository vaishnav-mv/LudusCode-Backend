import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IJudgeService } from '../interfaces/services'
import { IProblemRepository } from '../interfaces/repositories'
import { ExecuteDTO } from '../dto/request/judge.request.dto'

@singleton()
export class JudgeController {
    constructor(
        @inject("IJudgeService") private _service: IJudgeService,
        @inject("IProblemRepository") private _problemRepo: IProblemRepository
    ) { }

    /**
     * @desc    Execute code against test cases
     * @route   POST /api/judge/execute
     * @req     body: { problemId, userCode, language, customInputs }
     * @res     { overallStatus, results, executionTime, memoryUsage }
     */
    execute = async (req: Request, res: Response) => {
        const body = req.body as ExecuteDTO
        const { problemId, userCode, language } = body;
        const problem = await this._problemRepo.getById(problemId);
        if (!problem) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });

        // Find matching solution
        const problemDocument = problem as any;
        let solutionCode = problemDocument.solution?.code; // Fallback

        if (problemDocument.solutions && problemDocument.solutions.length > 0) {
            const match = problemDocument.solutions.find((solutionEntry: any) => solutionEntry.language.toLowerCase() === language.toLowerCase());
            if (match) solutionCode = match.code;
        }

        let testCasesToRun = (problem as any).testCases;
        const { customInputs } = body;

        if (customInputs && Array.isArray(customInputs) && customInputs.length > 0) {
            if (solutionCode) {
                // Run solution code to generate expected outputs
                const dummyTestCases = customInputs.map((input: string) => ({ input, output: 'null', isSample: false }));
                const solutionResult = await this._service.execute(solutionCode, solutionCode, dummyTestCases, problem, language);

                testCasesToRun = solutionResult.results.map((res: any, idx: number) => {
                    // When generating expected outputs, 'Wrong Answer' is expected because we use 'null' as dummy expected output.
                    // We only consider it a failure if the solution crashed (Runtime Error, etc.)
                    const isFailure = res.status !== 'Accepted' && res.status !== 'Wrong Answer';

                    if (isFailure) {
                        return {
                            input: customInputs[idx],
                            output: JSON.stringify(`System Error: Official solution failed - ${res.userOutput}`),
                            isSample: false
                        };
                    }
                    return {
                        input: customInputs[idx],
                        output: res.userOutput, // This is the expected output (JSON stringified)
                        isSample: false
                    }
                });
            } else {
                // Should define behavior if no solution code available? 
            }
        }

        const executionResult = await this._service.execute(userCode, solutionCode || '', testCasesToRun, problem, language);
        res.json(executionResult);
    }
}

