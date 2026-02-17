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
        
        Ensure the problem description is engaging and clear. Provide at least 5 diverse test cases, including edge cases. Two of the test cases must be sample cases visible to the user. The solution should be optimal.`;

        const schema = {
            type: 'OBJECT' as const,
            properties: {
                title: { type: 'STRING' as const },
                description: { type: 'STRING' as const },
                difficulty: { type: 'STRING' as const, enum: ['Easy', 'Medium', 'Hard'] },
                constraints: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
                inputFormat: { type: 'STRING' as const },
                outputFormat: { type: 'STRING' as const },
                testCases: {
                    type: 'ARRAY' as const,
                    items: {
                        type: 'OBJECT' as const,
                        properties: {
                            input: { type: 'STRING' as const },
                            output: { type: 'STRING' as const },
                            isSample: { type: 'BOOLEAN' as const }
                        },
                        required: ['input', 'output', 'isSample']
                    }
                },
                solution: {
                    type: 'OBJECT' as const,
                    properties: {
                        language: { type: 'STRING' as const },
                        code: { type: 'STRING' as const }
                    },
                    required: ['language', 'code']
                }
            },
            required: ['title', 'description', 'difficulty', 'constraints', 'inputFormat', 'outputFormat', 'testCases', 'solution']
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
