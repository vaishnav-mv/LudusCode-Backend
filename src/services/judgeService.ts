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

    let solutionCode = problem.solution?.code;
    if (problem.solutions && problem.solutions.length > 0) {
      const match = problem.solutions.find((solution: { language: string, code: string }) => solution.language.toLowerCase() === language.toLowerCase());
      if (match) solutionCode = match.code;
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
    const languageMap: Record<string, { language: string }> = {
      'javascript': { language: 'javascript' },
      'js': { language: 'javascript' },
      'python': { language: 'python' },
      'py': { language: 'python' },
      // c/cpp/java not supported locally yet without robust setup
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

    for (const testCase of testCases) {
      try {
        let runCode = userCode;

        // Language specific wrappers
        if (config.language === 'javascript') {
          // Basic wrapper to call solution(input) and log result
          const fnName = (problem && problem.functionName) ? problem.functionName : 'solution';
          runCode = `
${userCode}

const userFn = (typeof ${fnName} !== 'undefined') ? ${fnName} : ((typeof solution !== 'undefined') ? solution : undefined);

if (userFn) {
  const input = ${testCase.input}; // Inject input directly
  // Heuristic: If input is array AND function expects multiple arguments (length > 1), spread it.
  // Otherwise, pass it as a single argument (e.g. solution(nums) where nums is array).
  if (Array.isArray(input) && userFn.length > 1) { 
     console.log(JSON.stringify(userFn(...input)));
  } else {
     console.log(JSON.stringify(userFn(input)));
  }
} else {
  console.log("No function found");
}
`
        } else if (config.language === 'python') {
          const fnName = (problem && problem.functionName) ? problem.functionName : 'solution';
          runCode = `
import json
import sys

${userCode}

try:
    input_str = '${testCase.input.replace(/'/g, "\\'")}'
    input_val = json.loads(input_str)
    
    # Check if function exists
    if '${fnName}' in locals():
        func = locals()['${fnName}']
        if isinstance(input_val, list) and not isinstance(input_val, str):
             # Simple heuristic: if input is list, try unpacking? 
             # Assumption: Input is either a single argument or a list of arguments (piston/leetcode style).
             try:
                print(json.dumps(func(*input_val)))
             except TypeError:
                print(json.dumps(func(input_val)))
        else:
            print(json.dumps(func(input_val)))
    elif 'solution' in locals():
        print(json.dumps(solution(input_val)))
    else:
        print("No function found")
except Exception as error:
    print(str(error), file=sys.stderr)
`
        }

        const run = await this._codeExecutor.execute(config.language, runCode);

        const output = run.stdout ? run.stdout.trim() : '';
        const stderr = run.stderr ? run.stderr.trim() : '';


        if (run.code !== 0 || stderr) {
          results.push({ testCase, status: SubmissionStatus.RuntimeError, userOutput: stderr || "Runtime Error" });
        } else {
          // Compare output
          const normalize = (str: string) => {
            try {
              // Parse JSON and sort keys recursively to ensure {"a":1, "b":2} === {"b":2, "a":1}
              const obj = JSON.parse(str);
              const sortKeys = (obj: unknown): unknown => {
                if (Array.isArray(obj)) {
                  return obj.map(sortKeys);
                } else if (obj !== null && typeof obj === 'object') {
                  const sorted: Record<string, unknown> = {};
                  Object.keys(obj as Record<string, unknown>).sort().forEach(key => {
                    sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
                  });
                  return sorted;
                }
                return obj;
              };
              return JSON.stringify(sortKeys(obj));
            } catch {
              return str.trim(); // Fallback to trimmed string if not valid JSON
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

    const overall = passed === testCases.length ? SubmissionStatus.Accepted : SubmissionStatus.WrongAnswer;

    return {
      overallStatus: overall,
      results,
      executionTime: Math.floor(Math.random() * 100), // Mock time
      memoryUsage: 0
    }
  }
  async executeScratchpad(userCode: string, language: string): Promise<SubmissionResult> {
    const languageMap: Record<string, { language: string }> = {
      'javascript': { language: 'javascript' },
      'python': { language: 'python' }
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
