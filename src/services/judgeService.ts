import { singleton, inject } from 'tsyringe'
import { IProblemRepository } from '../interfaces/repositories'
import { ICodeExecutionProvider } from '../interfaces/providers'

import { SubmissionResult, SubmissionStatus, TestCase, Problem, TestCaseResult } from '../types'
import { IJudgeService } from '../interfaces/services'

@singleton()
export class JudgeService implements IJudgeService {
  constructor(
    @inject("ICodeExecutionProvider") private _codeExecutor: ICodeExecutionProvider,
    @inject("IProblemRepository") private _problemRepo: IProblemRepository
  ) { }

  async execute(problemId: string, userCode: string, language: string, customInputs?: string[]): Promise<SubmissionResult> {
    const problem = await this._problemRepo.getById(problemId);
    if (!problem) throw new Error("Problem not found");

    let solutionCode: string | undefined;
    if (problem.solutions && problem.solutions.length > 0) {
      const match = problem.solutions.find((solution: { language: string, code: string }) => solution.language.toLowerCase() === language.toLowerCase());
      solutionCode = match ? match.code : problem.solutions[0].code;
    }

    let testCasesToRun: TestCase[] = problem.testCases || [];

    if (customInputs && customInputs.length > 0) {
      if (solutionCode) {
        const dummyTestCases = customInputs.map((input: string) => ({ input, output: 'null', isSample: false } as TestCase));
        const solutionResult = await this._executeInternal(solutionCode, solutionCode, dummyTestCases, problem, language);

        testCasesToRun = solutionResult.results.map((res, idx) => {
          const isFailure = res.status !== 'Accepted' && res.status !== 'Wrong Answer';
          if (isFailure) {
            return {
              input: customInputs[idx],
              output: JSON.stringify(`System Error: Official solution failed - ${res.userOutput}`),
              isSample: false
            } as TestCase;
          }
          return {
            input: customInputs[idx],
            output: res.userOutput,
            isSample: false
          } as TestCase;
        });
      }
    }

    return this._executeInternal(userCode, solutionCode || '', testCasesToRun, problem, language);
  }

  private async _executeInternal(userCode: string, solutionCode: string, testCases: TestCase[], problem?: Problem, language: string = 'javascript'): Promise<SubmissionResult> {
    const timeLimitMs = problem?.timeLimitMs || 5000;
    const languageMap: Record<string, { language: string }> = {
      'javascript': { language: 'javascript' },
      'js': { language: 'javascript' },
    }

    const config = languageMap[language.toLowerCase()];
    if (!config) {
      return {
        overallStatus: SubmissionStatus.RuntimeError,
        results: [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: "Language not supported locally" }],
        executionTime: 0,
        memoryUsage: 0
      }
    }

    const results: TestCaseResult[] = []
    let passed = 0
    let totalTimeMs = 0
    let peakMemoryKB = 0

    for (const testCase of testCases) {
      try {
        let runCode = userCode;

        // Language specific wrappers
        if (config.language === 'javascript') {
          const fnName = (problem && problem.functionName) ? problem.functionName : 'solution';
          const hasMultipleParams = problem?.inputSchema && problem.inputSchema.length > 1;
          const hasSingleParam = problem?.inputSchema && problem.inputSchema.length === 1;

          // Build the call logic based on inputSchema
          let callLogic: string;
          if (hasMultipleParams) {
            // inputSchema has multiple params — test input is an array of args, always spread
            callLogic = `console.log(JSON.stringify(userFn(...input)));`;
          } else if (hasSingleParam) {
            // inputSchema has exactly 1 param — pass input as single argument
            callLogic = `console.log(JSON.stringify(userFn(input)));`;
          } else {
            // No inputSchema — use old heuristic for backward compatibility
            callLogic = `if (Array.isArray(input) && userFn.length > 1) {
    console.log(JSON.stringify(userFn(...input)));
  } else {
    console.log(JSON.stringify(userFn(input)));
  }`;
          }

          runCode = `
${userCode}

const userFn = (typeof ${fnName} !== 'undefined') ? ${fnName} : ((typeof solution !== 'undefined') ? solution : undefined);

if (userFn) {
  const input = ${testCase.input};
  ${callLogic}
} else {
  console.log("No function found");
}
`
        }

        const run = await this._codeExecutor.execute(config.language, runCode, timeLimitMs);

        const output = run.stdout ? run.stdout.trim() : '';
        const stderr = run.stderr ? run.stderr.trim() : '';
        totalTimeMs += run.executionTimeMs || 0;
        if (run.memoryKB && run.memoryKB > peakMemoryKB) peakMemoryKB = run.memoryKB;

        if (run.timedOut) {
          results.push({ testCase, status: SubmissionStatus.TimeLimitExceeded, userOutput: `Execution timed out (limit: ${timeLimitMs}ms)` });
        } else if (run.code !== 0 || stderr) {
          results.push({ testCase, status: SubmissionStatus.RuntimeError, userOutput: stderr || "Runtime Error" });
        } else {
          // Compare output using deep normalization
          const normalize = (str: string): string => {
            const trimmed = str.trim();
            if (!trimmed) return '';
            try {
              const obj = JSON.parse(trimmed);
              // Recursively sort object keys and normalize numeric values
              const deepNormalize = (val: unknown): unknown => {
                if (Array.isArray(val)) {
                  return val.map(deepNormalize);
                } else if (val !== null && typeof val === 'object') {
                  const sorted: Record<string, unknown> = {};
                  Object.keys(val as Record<string, unknown>).sort().forEach(key => {
                    sorted[key] = deepNormalize((val as Record<string, unknown>)[key]);
                  });
                  return sorted;
                } else if (typeof val === 'number') {
                  // Normalize floats: 2.0 === 2, handle precision
                  return Number.isInteger(val) ? val : parseFloat(val.toPrecision(12));
                }
                return val;
              };
              return JSON.stringify(deepNormalize(obj));
            } catch {
              // Not valid JSON — normalize as plain text
              // Strip trailing newlines and collapse whitespace per line
              return trimmed.split('\n').map(line => line.trimEnd()).join('\n');
            }
          };

          const expected = normalize(testCase.output);
          const actual = normalize(output);

          if (actual === expected) {
            results.push({ testCase, status: SubmissionStatus.Accepted, userOutput: output });
            passed++;
          } else {
            results.push({ testCase, status: SubmissionStatus.WrongAnswer, userOutput: output });
          }
        }

      } catch (error: unknown) {
        const msg = (error as Error).message || "System Error";
        results.push({ testCase, status: SubmissionStatus.RuntimeError, userOutput: msg });
      }
    }

    // Determine overall status: TLE takes priority over WrongAnswer
    let overall: SubmissionStatus;
    if (passed === testCases.length) {
      overall = SubmissionStatus.Accepted;
    } else if (results.some(result => result.status === SubmissionStatus.TimeLimitExceeded)) {
      overall = SubmissionStatus.TimeLimitExceeded;
    } else if (results.some(result => result.status === SubmissionStatus.RuntimeError)) {
      overall = SubmissionStatus.RuntimeError;
    } else {
      overall = SubmissionStatus.WrongAnswer;
    }

    return {
      overallStatus: overall,
      results,
      executionTime: totalTimeMs,
      memoryUsage: peakMemoryKB
    }
  }
  async executeScratchpad(userCode: string, language: string): Promise<SubmissionResult> {
    const languageMap: Record<string, { language: string }> = {
      'javascript': { language: 'javascript' },
    };

    const config = languageMap[language.toLowerCase()] || languageMap['javascript'];

    try {
      const run = await this._codeExecutor.execute(config.language, userCode);

      const output = run.stderr ? run.stderr : run.stdout;
      const status = run.code === 0 ? SubmissionStatus.Accepted : SubmissionStatus.RuntimeError;

      return {
        overallStatus: status,
        results: [{ testCase: {} as TestCase, status: status, userOutput: output }],
        executionTime: 0,
        memoryUsage: 0
      };

    } catch (error: unknown) {
      const msg = (error as Error).message || "System Error";
      return {
        overallStatus: SubmissionStatus.RuntimeError,
        results: [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: msg }],
        executionTime: 0,
        memoryUsage: 0
      };
    }
  }
}
