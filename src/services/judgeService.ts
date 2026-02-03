import { singleton, inject } from 'tsyringe'

import { SubmissionResult, SubmissionStatus, TestCase } from '../types'
import { IJudgeService } from '../interfaces/services'
import vm from 'vm'

const createResult = (overallStatus: SubmissionStatus, results: any[]): SubmissionResult => ({ overallStatus, results, executionTime: Math.floor(Math.random() * 500) + 50, memoryUsage: Math.round((Math.random() * 100 + 10) * 10) / 10 })

@singleton()
export class JudgeService implements IJudgeService {
  constructor() { }

  async execute(userCode: string, solutionCode: string, testCases: TestCase[], problem?: any, language: string = 'javascript'): Promise<SubmissionResult> {
    const isJs = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js'

    if (isJs) {
      const results: any[] = []
      let passed = 0
      const start = performance.now()

      for (const testCase of testCases) {
        try {
          let parsedInput;
          try {
            parsedInput = JSON.parse(testCase.input);
          } catch (err) {
            throw new Error(`Invalid Input JSON: ${testCase.input}`);
          }

          const consoleOutput: string[] = [];
          const sandbox = {
            input: parsedInput,
            result: undefined,
            console: {
              log: (...args: any[]) => {
                consoleOutput.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
              }
            }
          }
          vm.createContext(sandbox)

          // Wrap user code to return result or assign to result
          const fnName = (problem && problem.functionName) ? problem.functionName : 'solution';

          // Strip import/export statements as they are not supported in VM
          const sanitizedCode = userCode
            .replace(/^\s*import\s+.*$/gm, '')
            .replace(/^\s*export\s+.*$/gm, '');

          const wrapped = `
              ${sanitizedCode}
              if (typeof ${fnName} === 'function') {
              // Support both single argument and multiple arguments if input is an array
              if (Array.isArray(input)) {
                result = ${fnName}(...input)
              } else {
                result = ${fnName}(input)
              }
            } else if (typeof solution === 'function') {
               // Fallback to 'solution' if functionName undefined but solution exists
               if (Array.isArray(input)) {
                 result = solution(...input)
               } else {
                 result = solution(input)
               }
            } else {
              // Fallback if they didn't define solution function, try to eval
              result = eval(input)
            }
            `

          vm.runInContext(wrapped, sandbox, { timeout: 1000 })

          let output;
          try {
            // Prioritize return value, but if undefined, check console output
            if (sandbox.result !== undefined) {
              output = JSON.stringify(sandbox.result);
            } else if (consoleOutput.length > 0) {
              // If no return value but console logs exist, use them as output
              output = consoleOutput.join('\n');
            } else {
              output = 'undefined';
            }

          } catch (err) {
            output = 'Error stringifying output';
          }

          let expected;
          try {
            // If testCase.output is already a string representation of the result, we might not need to parse and stringify again
            // But to be safe and normalize formatting (e.g. spacing in arrays), we usually do.
            // However, if testCase.output is NOT valid JSON (e.g. a raw string "Hello"), JSON.parse will fail if it's not quoted.
            expected = JSON.stringify(JSON.parse(testCase.output));
          } catch (err) {
            // If we can't parse the expected output, assume it's a raw string comparison or just use it as is
            expected = testCase.output;
          }

          if (output === expected) {
            results.push({ testCase: testCase, status: SubmissionStatus.Accepted, userOutput: output })
            passed++
          } else {
            results.push({ testCase: testCase, status: SubmissionStatus.WrongAnswer, userOutput: output })
          }
        } catch (e: any) {
          console.error('[JudgeService] Execution Error:', e);
          results.push({ testCase: testCase, status: SubmissionStatus.RuntimeError, userOutput: e.message })
        }
      }

      const end = performance.now()
      const overall = passed === testCases.length ? SubmissionStatus.Accepted : SubmissionStatus.WrongAnswer

      return {
        overallStatus: overall,
        results,
        executionTime: Math.round(end - start),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10
      }
    } else if (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') {
      const results: any[] = []
      let passed = 0
      const start = performance.now()

      const { spawn } = require('child_process');

      for (const testCase of testCases) {
        try {
          // Simplified approach: Expect a complete script or function named 'solution'

          let runnerCode = userCode;
          const inputData = testCase.input; // JSON string input

          // We need to inject code to call the function if it's a function-based problem
          if (problem && problem.functionName) {
            runnerCode += `\n\nimport json\nimport sys\n\ntry:\n    input_val = json.loads('${inputData.replace(/'/g, "\\'")}')\n    if isinstance(input_val, list) and not isinstance(input_val, str):\n        print(json.dumps(${problem.functionName}(*input_val)))\n    else:\n        print(json.dumps(${problem.functionName}(input_val)))\nexcept Exception as e:\n    print(str(e), file=sys.stderr)`;
          } else {
            // Script based: We might need to pipe input to stdin, but for now let's assume standard function wrapper for competitive coding style
            runnerCode += `\n\nimport json\nimport sys\n\n# Fallback wrapper if no specific function name\ntry:\n    # pass\n    pass 
except Exception as e:\n    print(str(e), file=sys.stderr)`;
          }

          const pythonProcess = spawn('python', ['-c', runnerCode]);

          let output = '';
          let errorOutput = '';

          await new Promise<void>((resolve) => {
            pythonProcess.stdout.on('data', (data: any) => {
              output += data.toString();
            });

            pythonProcess.stderr.on('data', (data: any) => {
              errorOutput += data.toString();
            });

            pythonProcess.on('close', (code: any) => {
              resolve();
            });

            // Timeout
            setTimeout(() => {
              pythonProcess.kill();
              errorOutput = 'Time Limit Exceeded';
              resolve();
            }, 2000);
          });

          output = output.trim();
          const expected = JSON.stringify(JSON.parse(testCase.output));

          // Python's json.dumps might be slightly different spacing, so we normalize by parsing back
          let normalizedOutput = output;
          try {
            normalizedOutput = JSON.stringify(JSON.parse(output));
          } catch (e) { }

          if (normalizedOutput === expected && !errorOutput) {
            results.push({ testCase: testCase, status: SubmissionStatus.Accepted, userOutput: output })
            passed++
          } else if (errorOutput) {
            results.push({ testCase: testCase, status: errorOutput.includes('Time Limit') ? SubmissionStatus.TimeLimitExceeded : SubmissionStatus.RuntimeError, userOutput: errorOutput })
          } else {
            results.push({ testCase: testCase, status: SubmissionStatus.WrongAnswer, userOutput: output })
          }

        } catch (e: any) {
          results.push({ testCase: testCase, status: SubmissionStatus.RuntimeError, userOutput: e.message })
        }
      }

      const end = performance.now()
      const overall = passed === testCases.length ? SubmissionStatus.Accepted : SubmissionStatus.WrongAnswer

      return {
        overallStatus: overall,
        results,
        executionTime: Math.round(end - start),
        memoryUsage: 0 // Cannot easily get memory usage from spawn without complex logic
      }

    } else {
      return createResult(SubmissionStatus.RuntimeError, [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: "Language not supported" }])
    }
  }
  async executeScratchpad(userCode: string, language: string): Promise<SubmissionResult> {
    const isJs = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js';

    if (isJs) {
      const start = performance.now();
      try {
        const consoleOutput: string[] = [];
        const sandbox = {
          console: {
            log: (...args: any[]) => {
              consoleOutput.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
            }
          }
        };
        vm.createContext(sandbox);
        const resultVal = vm.runInContext(userCode, sandbox, { timeout: 1000 });
        const end = performance.now();

        if (resultVal !== undefined) {
          consoleOutput.push(String(resultVal));
        }

        const finalOutput = consoleOutput.length > 0 ? consoleOutput.join('\n') : 'No output';

        return {
          overallStatus: SubmissionStatus.Accepted,
          results: [{ testCase: null as any, status: SubmissionStatus.Accepted, userOutput: finalOutput }],
          executionTime: Math.round(end - start),
          memoryUsage: 0
        };

      } catch (e: any) {
        return {
          overallStatus: SubmissionStatus.RuntimeError,
          results: [{ testCase: null as any, status: SubmissionStatus.RuntimeError, userOutput: e.message }],
          executionTime: 0,
          memoryUsage: 0
        };
      }
    } else {
      // Python
      const start = performance.now();
      const { spawn } = require('child_process');

      return new Promise((resolve) => {
        const pythonProcess = spawn('python', ['-c', userCode]);
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data: any) => output += data.toString());
        pythonProcess.stderr.on('data', (data: any) => errorOutput += data.toString());

        const timeout = setTimeout(() => {
          pythonProcess.kill();
          resolve({
            overallStatus: SubmissionStatus.TimeLimitExceeded,
            results: [{ testCase: null as any, status: SubmissionStatus.TimeLimitExceeded, userOutput: "Time Limit Exceeded" }],
            executionTime: 2000,
            memoryUsage: 0
          });
        }, 2000);

        pythonProcess.on('error', (err: any) => {
          console.error("Python Spawn Error", err);
          clearTimeout(timeout);
          resolve({
            overallStatus: SubmissionStatus.RuntimeError,
            results: [{ testCase: null as any, status: SubmissionStatus.RuntimeError, userOutput: `Failed to start Python process: ${err.message}` }],
            executionTime: 0,
            memoryUsage: 0
          });
        });

        pythonProcess.on('close', (code: number) => {
          clearTimeout(timeout);
          const end = performance.now();
          const finalOutput = errorOutput ? errorOutput : output;
          const status = errorOutput ? SubmissionStatus.RuntimeError : SubmissionStatus.Accepted;

          resolve({
            overallStatus: status,
            results: [{ testCase: null as any, status: status, userOutput: finalOutput.trim() }],
            executionTime: Math.round(end - start),
            memoryUsage: 0
          });
        });
      });
    }
  }
}
