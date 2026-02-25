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
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);

        const prompt = `
            You are an expert Senior Software Engineer. Review the following code submission for the problem "${problem.title}".

            Problem Description:
            ${problem.description || 'N/A'}

            User Code:
            ${userCode}

            Provide a constructive, professional code review. Calculate the Big O time and space complexity. Give a readability score from 1 to 10. Finally, provide a list of specific, actionable suggestions for improving the code's complexity, readability, or structure.
        `;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                complexityAnalysis: {
                    type: 'STRING' as const,
                    description: "A short sentence describing the Time and Space complexity in Big O notation."
                },
                readabilityScore: {
                    type: 'INTEGER' as const,
                    description: "An integer score from 1 to 10 representing code readability."
                },
                readabilityFeedback: {
                    type: 'STRING' as const,
                    description: "A short sentence explaining the readability score."
                },
                suggestions: {
                    type: 'ARRAY' as const,
                    items: { type: 'STRING' as const },
                    description: "A list of 2-4 actionable code improvement suggestions."
                }
            },
            required: ["complexityAnalysis", "readabilityScore", "readabilityFeedback", "suggestions"] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.3
            }
        });

        return (result.text ?? '').trim();
    }

    async performance(profile: { user: User, submissionStats: { total: number, accepted: number, acceptanceRate: number }, joinedGroups: Group[] }) {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);

        const prompt = `
  You are an expert competitive programming coach. Analyze the performance of the following user and provide a concise, actionable summary.

  User Profile:
  - Name: ${profile.user.username}
  - Rank: ${profile.user.leaderboardRank || 'N/A'}
  - Elo: ${profile.user.elo}
  - Duels Won: ${profile.user.duelsWon}
  - Duels Lost: ${profile.user.duelsLost}
  - Win Rate: ${profile.submissionStats.acceptanceRate.toFixed(1)}%

  Based on this data, identify the user's key strengths, weaknesses, and provide specific recommendations for improvement. Be encouraging but direct. Focus on patterns in the data.
  `;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                strengths: {
                    type: 'ARRAY' as const,
                    items: { type: 'STRING' as const },
                    description: "A list of 2-3 specific strengths based on their history or win rate."
                },
                weaknesses: {
                    type: 'ARRAY' as const,
                    items: { type: 'STRING' as const },
                    description: "A list of 2-3 specific weaknesses or areas indicating room for improvement."
                },
                recommendations: {
                    type: 'ARRAY' as const,
                    items: { type: 'STRING' as const },
                    description: "A list of 2-3 specific, actionable recommendations for practice or study."
                }
            },
            required: ["strengths", "weaknesses", "recommendations"] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.5
            }
        });

        // The frontend expects the analysis to be the JSON string which it then parses.
        // Wait, AiController.performance wraps it: { analysis: string }
        // Frontend getAIPerformanceAnalysis:
        // const text = (res.data.data.analysis as unknown as string);
        // Then it does JSON.parse or acts on it.
        // Let's return the generated JSON text.
        return (result.text ?? '').trim();
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
                solutions: {
                    type: 'ARRAY' as const,
                    items: {
                        type: 'OBJECT' as const,
                        properties: {
                            language: { type: 'STRING' as const },
                            code: { type: 'STRING' as const }
                        },
                        required: ['language', 'code'] as string[]
                    }
                }
            },
            required: ['title', 'description', 'difficulty', 'constraints', 'inputFormat', 'outputFormat', 'functionName', 'inputSchema', 'outputSchema', 'testCases', 'solutions'] as string[]
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
        if (problem.solutions && problem.solutions.length > 0) {
            problem.solutions = problem.solutions.map((s: { language: string; code: string }) => ({ language: 'javascript', code: s.code }));
        }

        // Auto-generate starterCode from functionName + inputSchema
        const mapTypeToJSDoc = (type: string, elementType?: string): string => {
            switch (type) {
                case 'integer':
                case 'float':
                    return 'number';
                case 'string':
                case 'boolean':
                case 'object':
                    return type;
                case 'char':
                    return 'string';
                case 'array':
                    return elementType ? `${mapTypeToJSDoc(elementType)}[]` : 'any[]';
                case 'matrix':
                    return elementType ? `${mapTypeToJSDoc(elementType)}[][]` : 'any[][]';
                default:
                    return 'any';
            }
        };

        const fnName = problem.functionName || 'solution';

        if (!problem.inputSchema || problem.inputSchema.length === 0) {
            problem.starterCode = `/**\n * @param {any} input\n * @returns {any}\n */\nfunction ${fnName}(input) {\n    // Write your code here\n    \n}`;
        } else {
            const paramsList = problem.inputSchema.map((s: Record<string, unknown>) => {
                const jsDocType = mapTypeToJSDoc(s.type as string, s.elementType as string);
                return { name: (s.name as string) || 'param', jsDocType };
            });

            const returnType = (problem.outputSchema && problem.outputSchema.length > 0)
                ? mapTypeToJSDoc((problem.outputSchema as Record<string, unknown>[])[0].type as string, (problem.outputSchema as Record<string, unknown>[])[0].elementType as string)
                : 'any';

            const jsDocs = paramsList.map((p: { jsDocType: string, name: string }) => ` * @param {${p.jsDocType}} ${p.name}`);
            jsDocs.push(` * @returns {${returnType}}`);

            const paramListStr = paramsList.map((p: { name: string }) => p.name).join(', ');

            problem.starterCode = `/**\n${jsDocs.join('\n')}\n */\nfunction ${fnName}(${paramListStr}) {\n    // Write your code here\n    \n}`;
        }

        // Default timeLimitMs if not provided
        if (!problem.timeLimitMs) {
            problem.timeLimitMs = problem.difficulty === 'Easy' ? 2000 : problem.difficulty === 'Medium' ? 3000 : 5000;
        }

        return { ...problem, id: new Date().toISOString(), status: 'Pending' } as Problem;
    }

    async complexity(userCode: string) {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);

        const prompt = `
            Analyze the following code and provide its Big O Time Complexity and Space Complexity.
            Be concise. Provide only the Big O notation and a short 1-line explanation.
            Code:
            ${userCode}
        `;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                time: {
                    type: 'STRING' as const,
                    description: "Time complexity in Big O notation (e.g. O(n), O(1))"
                },
                space: {
                    type: 'STRING' as const,
                    description: "Space complexity in Big O notation (e.g. O(n), O(1))"
                }
            },
            required: ["time", "space"] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.1
            }
        });

        return (result.text ?? '').trim();
    }

    async optimize(problem: Problem, userCode: string) {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);

        const prompt = `
            Analyze the following user code snippet for the problem "${problem.title}".
            Refactor the code to be as optimal, clean, and idiomatic as possible. If the algorithmic complexity can be improved, improve it.
            
            Problem Constraints:
            ${problem.constraints?.join('\n')}

            User Code:
            ${userCode}
        `;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                optimizedCode: { type: 'STRING' as const, description: "The fully refactored, executable code" },
                explanation: { type: 'STRING' as const, description: "Detailed explanation of what was changed and why" },
                timeComplexity: { type: 'STRING' as const, description: "New Time Complexity (Big O)" },
                spaceComplexity: { type: 'STRING' as const, description: "New Space Complexity (Big O)" }
            },
            required: ["optimizedCode", "explanation", "timeComplexity", "spaceComplexity"] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.3
            }
        });

        return (result.text ?? '').trim();
    }

    async edgeCases(problem: Problem, userCode: string) {
        if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);

        const prompt = `
            Analyze the following user code snippet for the problem "${problem.title}".
            Identify edge cases, boundary conditions, or hidden flaws that this code might fail on or handle poorly.
            Provide specific input examples that might break it.

            Problem Statement:
            ${problem.description}

            User Code:
            ${userCode}
        `;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                vulnerabilities: {
                    type: 'ARRAY' as const,
                    items: {
                        type: 'OBJECT' as const,
                        properties: {
                            description: { type: 'STRING' as const, description: "Description of the edge case or flaw" },
                            exampleInput: { type: 'STRING' as const, description: "Example input that exposes this" }
                        },
                        required: ["description", "exampleInput"] as string[]
                    }
                },
                overallAssessment: { type: 'STRING' as const, description: "A brief summary of the robustness of the code." }
            },
            required: ["vulnerabilities", "overallAssessment"] as string[]
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.5
            }
        });

        return (result.text ?? '').trim();
    }
}
