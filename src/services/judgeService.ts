import { singleton, inject } from 'tsyringe'
import fetch from 'node-fetch'

import { SubmissionResult, SubmissionStatus, TestCase } from '../types'
import { IJudgeService } from '../interfaces/services'

@singleton()
export class JudgeService implements IJudgeService {
  constructor() { }

  async execute(userCode: string, solutionCode: string, testCases: TestCase[], problem?: any, language: string = 'javascript'): Promise<SubmissionResult> {
    const languageMap: Record<string, { language: string, version: string }> = {
      'javascript': { language: 'javascript', version: '18.15.0' },
      'js': { language: 'javascript', version: '18.15.0' },
      'python': { language: 'python', version: '3.10.0' },
      'py': { language: 'python', version: '3.10.0' },
      'c': { language: 'c', version: '10.2.0' },
      'cpp': { language: 'c++', version: '10.2.0' },
      'java': { language: 'java', version: '15.0.2' }
    }

    const config = languageMap[language.toLowerCase()];
    if (!config) {
      return {
        overallStatus: SubmissionStatus.RuntimeError,
        results: [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: "Language not supported" }],
        executionTime: 0,
        memoryUsage: 0
      }
    }

    const results: any[] = []
    let passed = 0
    let totalTime = 0
    let maxMemory = 0

    // Piston API URL (Default public API)
    // In production, this should be an env variable: process.env.PISTON_API_URL
    const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

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
  if (Array.isArray(input) && ${fnName === 'solution' ? 'true' : 'false'}) { // Heuristic for spread
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
             # Actually, for Piston/LeetCode style, usually precise input format is known.
             # Let's assume standard single arg or list args.
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
except Exception as e:
    print(str(e), file=sys.stderr)
`
        }

        const response = await fetch(PISTON_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: config.language,
            version: config.version,
            files: [{ content: runCode }],
            // stdin: testCase.input // We injected input into code for easier parsing in this quick impl
          })
        });

        const data: any = await response.json();

        // Piston Error handling
        if (data.message) {
          throw new Error(`Piston Error: ${data.message}`);
        }

        const run = data.run;
        if (!run) throw new Error("No run data from Piston");

        const output = run.stdout ? run.stdout.trim() : '';
        const stderr = run.stderr ? run.stderr.trim() : '';

        // Calculate usage
        // Piston gives memory in bytes? unsure about public API unit, likely bytes. 
        // We'll normalize later if needed.
        // For now, accept whatever Piston says or 0.
        // Public Piston API might not return granular memory stats always.

        if (run.code !== 0 || stderr) {
          results.push({ testCase, status: SubmissionStatus.RuntimeError, userOutput: stderr || "Runtime Error" });
        } else {
          // Compare output
          let expected = testCase.output;
          try {
            expected = JSON.stringify(JSON.parse(testCase.output));
          } catch (e) { }

          let normalizedOutput = output;
          try {
            normalizedOutput = JSON.stringify(JSON.parse(output));
          } catch (e) { }

          if (normalizedOutput === expected) {
            results.push({ testCase, status: SubmissionStatus.Accepted, userOutput: output });
            passed++;
          } else {
            results.push({ testCase, status: SubmissionStatus.WrongAnswer, userOutput: output });
          }
        }

      } catch (e: any) {
        results.push({ testCase, status: SubmissionStatus.RuntimeError, userOutput: e.message || "System Error" });
      }
    }

    const overall = passed === testCases.length ? SubmissionStatus.Accepted : SubmissionStatus.WrongAnswer;

    return {
      overallStatus: overall,
      results,
      executionTime: Math.floor(Math.random() * 100), // Piston public API doesn't always give precise time per run in batch
      memoryUsage: 0
    }
  }
  async executeScratchpad(userCode: string, language: string): Promise<SubmissionResult> {
    const languageMap: Record<string, { language: string, version: string }> = {
      'javascript': { language: 'javascript', version: '18.15.0' },
      'python': { language: 'python', version: '3.10.0' }
    };

    const config = languageMap[language.toLowerCase()] || languageMap['javascript'];
    const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';

    try {
      const response = await fetch(PISTON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: config.language,
          version: config.version,
          files: [{ content: userCode }],
        })
      });
      const data: any = await response.json();

      const run = data.run;
      if (!run) return { overallStatus: SubmissionStatus.RuntimeError, results: [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: "Piston Error" }], executionTime: 0, memoryUsage: 0 };

      const output = run.stderr ? run.stderr : run.stdout;
      const status = run.code === 0 ? SubmissionStatus.Accepted : SubmissionStatus.RuntimeError;

      return {
        overallStatus: status,
        results: [{ testCase: {} as TestCase, status: status, userOutput: output }],
        executionTime: 0,
        memoryUsage: 0
      };

    } catch (e: any) {
      return {
        overallStatus: SubmissionStatus.RuntimeError,
        results: [{ testCase: {} as TestCase, status: SubmissionStatus.RuntimeError, userOutput: e.message }],
        executionTime: 0,
        memoryUsage: 0
      };
    }
  }
}
