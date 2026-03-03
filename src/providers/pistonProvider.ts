import { singleton } from 'tsyringe';
import { ICodeExecutionProvider } from '../interfaces/providers';
import { ExecutionResult } from '../interfaces/repositories';

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

@singleton()
export class PistonProvider implements ICodeExecutionProvider {

    // Piston requires both language name and version
    private languageMap: Record<string, { language: string; version: string }> = {
        'javascript': { language: 'javascript', version: '18.15.0' },
        'js': { language: 'javascript', version: '18.15.0' },
        'python': { language: 'python', version: '3.10.0' },
        'python3': { language: 'python', version: '3.10.0' },
        'cpp': { language: 'c++', version: '10.2.0' },
        'c': { language: 'c', version: '10.2.0' },
        'java': { language: 'java', version: '15.0.2' },
        'typescript': { language: 'typescript', version: '5.0.3' },
    };

    async execute(language: string, code: string, timeoutMs: number = 5000): Promise<ExecutionResult> {
        const config = this.languageMap[language.toLowerCase()];
        if (!config) {
            return { stdout: '', stderr: `Language '${language}' is not supported`, code: 1 };
        }

        try {
            const startTime = Date.now();

            const response = await fetch(PISTON_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: config.language,
                    version: config.version,
                    files: [{ content: code }],
                    run_timeout: timeoutMs,
                }),
            });

            const elapsed = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                return { stdout: '', stderr: `Piston API error (${response.status}): ${errorText}`, code: 1 };
            }

            const result = await response.json() as {
                run: {
                    stdout: string;
                    stderr: string;
                    code: number | null;
                    signal: string | null;
                    output: string;
                };
                compile?: {
                    stdout: string;
                    stderr: string;
                    code: number | null;
                };
            };

            const timedOut = result.run.signal === 'SIGKILL';
            const compileError = result.compile?.code !== null && result.compile?.code !== 0;

            return {
                stdout: result.run.stdout || '',
                stderr: compileError
                    ? (result.compile?.stderr || 'Compilation Error')
                    : (result.run.stderr || ''),
                code: result.run.code,
                timedOut,
                executionTimeMs: elapsed,
            };

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            return { stdout: '', stderr: `Piston request failed: ${msg}`, code: 1 };
        }
    }
}
