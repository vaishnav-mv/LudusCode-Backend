
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { singleton } from 'tsyringe';
import { ICodeExecutionProvider } from '../interfaces/providers';
import { ExecutionResult } from '../interfaces/repositories';

@singleton()
export class CodeExecutionProvider implements ICodeExecutionProvider {
    private _tempDir: string;

    constructor() {
        this._tempDir = path.join(os.tmpdir(), 'ludus-code-exec');
        if (!fs.existsSync(this._tempDir)) {
            fs.mkdirSync(this._tempDir, { recursive: true });
        }
    }

    async execute(language: string, code: string, timeoutMs: number = 5000): Promise<ExecutionResult> {
        const lang = language.toLowerCase();
        let extension = '';
        let cmd = '';


        if (lang === 'javascript' || lang === 'js') {
            extension = 'js';
            cmd = 'node';
        } else {
            return { stdout: '', stderr: 'Language not supported locally', code: 1 };
        }

        const filename = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const filepath = path.join(this._tempDir, filename);

        try {
            await fs.promises.writeFile(filepath, code);
            return await this.spawnProcess(cmd, [filepath], timeoutMs);
        } catch (error: unknown) {
            return { stdout: '', stderr: (error instanceof Error ? error.message : String(error)) || 'System Error', code: 1 };
        } finally {
            // Cleanup
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
    }

    private spawnProcess(cmd: string, args: string[], timeoutMs: number): Promise<ExecutionResult> {
        return new Promise((resolve) => {
            const startTime = process.hrtime.bigint();
            const child = spawn(cmd, args);
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let maxMemoryKB = 0;

            // Poll memory usage of child process
            const memoryInterval = setInterval(() => {
                try {
                    if (child.pid) {
                        const usage = process.memoryUsage();
                        const rssKB = Math.round(usage.rss / 1024);
                        if (rssKB > maxMemoryKB) maxMemoryKB = rssKB;
                    }
                } catch { /* process may have exited */ }
            }, 100);

            const timeout = setTimeout(() => {
                timedOut = true;
                child.kill();
                clearInterval(memoryInterval);
                const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
                resolve({
                    stdout,
                    stderr: stderr + '\nExecution timed out',
                    code: 1,
                    timedOut: true,
                    executionTimeMs: Math.round(elapsed),
                    memoryKB: maxMemoryKB
                });
            }, timeoutMs);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            const sanitize = (output: string) => {
                const tempDirRegex = new RegExp(this._tempDir.replace(/\\/g, '\\\\'), 'g');
                return output.replace(tempDirRegex, 'sandbox');
            };

            child.on('close', (code) => {
                if (!timedOut) {
                    clearTimeout(timeout);
                    clearInterval(memoryInterval);
                    const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
                    resolve({
                        stdout,
                        stderr: sanitize(stderr),
                        code,
                        timedOut: false,
                        executionTimeMs: Math.round(elapsed),
                        memoryKB: maxMemoryKB
                    });
                }
            });

            child.on('error', (err) => {
                if (!timedOut) {
                    clearTimeout(timeout);
                    clearInterval(memoryInterval);
                    const elapsed = Number(process.hrtime.bigint() - startTime) / 1e6;
                    resolve({
                        stdout,
                        stderr: sanitize(stderr + '\n' + err.message),
                        code: 1,
                        timedOut: false,
                        executionTimeMs: Math.round(elapsed),
                        memoryKB: maxMemoryKB
                    });
                }
            });
        });
    }
}
