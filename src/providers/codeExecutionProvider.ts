
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { singleton } from 'tsyringe';
import { ICodeExecutionProvider } from '../interfaces/providers';
import { ExecutionResult } from '../interfaces/repositories'; // Keep ExecutionResult here for now or move to definitions

@singleton()
export class CodeExecutionProvider implements ICodeExecutionProvider {
    private tempDir: string;

    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'ludus-code-exec');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async execute(language: string, code: string, timeoutMs: number = 5000): Promise<ExecutionResult> {
        const lang = language.toLowerCase();
        let extension = '';
        let cmd = '';
        let args: string[] = [];

        if (lang === 'javascript' || lang === 'js') {
            extension = 'js';
            cmd = 'node';
        } else if (lang === 'python' || lang === 'py') {
            extension = 'py';
            cmd = 'python';
        } else {
            return { stdout: '', stderr: 'Language not supported locally', code: 1 };
        }

        const filename = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const filepath = path.join(this.tempDir, filename);

        try {
            await fs.promises.writeFile(filepath, code);
            return await this.spawnProcess(cmd, [filepath], timeoutMs);
        } catch (error: any) {
            return { stdout: '', stderr: error.message || 'System Error', code: 1 };
        } finally {
            // Cleanup
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
    }

    private spawnProcess(cmd: string, args: string[], timeoutMs: number): Promise<ExecutionResult> {
        return new Promise((resolve) => {
            const child = spawn(cmd, args);
            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timeout = setTimeout(() => {
                timedOut = true;
                child.kill();
                resolve({ stdout, stderr: stderr + '\nExecution timed out', code: 1 });
            }, timeoutMs);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            const sanitize = (output: string) => {
                // Remove temp directory paths for cleaner output
                // Escaping backslashes for regex if windows
                const tempDirRegex = new RegExp(this.tempDir.replace(/\\/g, '\\\\'), 'g');
                return output.replace(tempDirRegex, 'sandbox');
            };

            child.on('close', (code) => {
                if (!timedOut) {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr: sanitize(stderr), code });
                }
            });

            child.on('error', (err) => {
                if (!timedOut) {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr: sanitize(stderr + '\n' + err.message), code: 1 });
                }
            });
        });
    }
}
