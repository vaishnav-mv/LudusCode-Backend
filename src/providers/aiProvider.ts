import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env'
import { singleton } from 'tsyringe'
import { IAiProvider } from '../interfaces/providers'
import { ResponseMessages } from '../constants'
import { Problem, User, Group } from '../types'

const ai: GoogleGenAI | null = env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY }) : null;
console.log(`[AiProvider] ${ai ? `Initialized with key ending ...${env.GOOGLE_API_KEY.slice(-4)}` : 'No GOOGLE_API_KEY set — AI features disabled'}`);

@singleton()
export class AiProvider implements IAiProvider {

    private async generate(model: string, prompt: string, temperature: number = 0.5): Promise<string> {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const result = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { temperature }
        });
        return (result.text ?? '').trim();
    }

    async hint(problem: Problem, userCode: string) {
        const prompt = `Provide a concise hint for problem ${problem.title}. User code:\n${userCode}`;
        return this.generate('gemini-2.5-flash', prompt, 0.6);
    }

    async codeReview(problem: Problem, userCode: string) {
        const prompt = `Code review for problem ${problem.title}. Code:\n${userCode}`;
        return this.generate('gemini-2.5-flash', prompt, 0.4);
    }

    async performance(profile: { user: User, submissionStats: { total: number, accepted: number, acceptanceRate: number }, joinedGroups: Group[] }) {
        const prompt = `Analyze performance for user ${profile.user.username} with win rate ${profile.submissionStats.acceptanceRate.toFixed(1)}%`;
        return this.generate('gemini-2.5-flash', prompt, 0.5);
    }

    async generateProblem(difficulty: string, topic: string) {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Generate a new, unique, and interesting competitive programming problem.

Difficulty: ${difficulty}
Topic: ${topic}

CRITICAL REQUIREMENTS:
1. The solution MUST be in JavaScript (not Python, not any other language). Use "function functionName(params) { ... }" syntax.
2. The "functionName" field MUST exactly match the function name used in the solution code.
3. Provide "inputSchema" describing each input parameter with name, type, and elementType (for arrays).
   Valid types: integer, float, string, boolean, char, array, matrix, object.
   For arrays, set type to "array" and elementType to the element type (e.g. "integer").
4. Provide "outputSchema" describing the return value.
5. Test case format:
   - If the function has ONE parameter: input is just the value, e.g. "[1,2,3]" or "5"
   - If the function has MULTIPLE parameters: input is a JSON array of all args, e.g. "[[2,7,11,15], 9]"
   - Output is always the JSON-stringified expected return value, e.g. "[0,1]" or "true"
6. Provide at least 5 diverse test cases including edge cases. At least 2 must be sample cases (isSample: true).
7. Provide relevant tags (e.g. "Array", "Hash Table", "Dynamic Programming", "String", "Math", etc.).
8. Provide an editorial explaining the approach, time complexity, and space complexity.
9. Suggest a timeLimitMs value (2000 for easy, 3000 for medium, 5000 for hard).
10. The solution should be optimal and correct for ALL test cases.`;

        const paramSchemaObj = {
            type: 'OBJECT' as const,
            properties: {
                name: { type: 'STRING' as const },
                type: { type: 'STRING' as const, enum: ['integer', 'float', 'string', 'boolean', 'char', 'array', 'matrix', 'object'] },
                elementType: { type: 'STRING' as const, enum: ['integer', 'float', 'string', 'boolean', 'char'] }
            },
            required: ['name', 'type'] as string[]
        };

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                title: { type: 'STRING' as const },
                description: { type: 'STRING' as const },
                difficulty: { type: 'STRING' as const, enum: ['Easy', 'Medium', 'Hard'] },
                constraints: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
                inputFormat: { type: 'STRING' as const },
                outputFormat: { type: 'STRING' as const },
                functionName: { type: 'STRING' as const },
                inputSchema: { type: 'ARRAY' as const, items: paramSchemaObj },
                outputSchema: { type: 'ARRAY' as const, items: paramSchemaObj },
                tags: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
                editorial: { type: 'STRING' as const },
                timeLimitMs: { type: 'NUMBER' as const },
                testCases: {
                    type: 'ARRAY' as const,
                    items: {
                        type: 'OBJECT' as const,
                        properties: {
                            input: { type: 'STRING' as const },
                            output: { type: 'STRING' as const },
                            isSample: { type: 'BOOLEAN' as const }
                        },
                        required: ['input', 'output', 'isSample'] as string[]
                    }
                },
                solution: {
                    type: 'OBJECT' as const,
                    properties: {
                        language: { type: 'STRING' as const },
                        code: { type: 'STRING' as const }
                    },
                    required: ['language', 'code'] as string[]
                }
            },
            required: ['title', 'description', 'difficulty', 'constraints', 'inputFormat', 'outputFormat', 'functionName', 'inputSchema', 'outputSchema', 'testCases', 'solution'] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.8
            }
        });

        const text = (result.text ?? '').trim();
        const problem = JSON.parse(text);

        // Post-processing: enforce JavaScript and consistency
        problem.solution.language = 'javascript';
        problem.solutions = [{ language: 'javascript', code: problem.solution.code }];

        // Auto-generate starterCode from functionName + inputSchema
        const fnName = problem.functionName || 'solution';
        const params = (problem.inputSchema || []).map((s: { name: string }) => s.name);
        const paramList = params.length > 0 ? params.join(', ') : 'input';
        problem.starterCode = `/**\n * @param {${(problem.inputSchema || []).map((s: { type: string }) => s.type).join(', ') || 'any'}} ${paramList}\n * @return {any}\n */\nfunction ${fnName}(${paramList}) {\n    // Write your code here\n    \n}`;

        // Default timeLimitMs if not provided
        if (!problem.timeLimitMs) {
            problem.timeLimitMs = problem.difficulty === 'Easy' ? 2000 : problem.difficulty === 'Medium' ? 3000 : 5000;
        }

        return { ...problem, id: new Date().toISOString(), status: 'Pending' } as Problem;
    }

    async explainConcept(concept: string) {
        const prompt = `Explain the following programming concept in a clear, beginner-friendly way: ${concept}`;
        return this.generate('gemini-1.5-flash', prompt, 0.7);
    }

    async summarizeDiscussion(messages: string[]) {
        const prompt = `Summarize the following discussion points into key takeaways:\n${messages.join('\n')}`;
        return this.generate('gemini-1.5-flash', prompt, 0.5);
    }

}
