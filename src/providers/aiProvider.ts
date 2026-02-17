import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env'
import { singleton } from 'tsyringe'
import { IAiProvider } from '../interfaces/providers'
import { ResponseMessages } from '../constants'
import { Problem, User, Group, GoogleGenAIInstance } from '../types'

const ai: GoogleGenAI | null = env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY }) : null;

@singleton()
export class AiProvider implements IAiProvider {
    private get ai(): GoogleGenAIInstance | null {
        return (ai as unknown) as GoogleGenAIInstance | null;
    }

    async hint(problem: Problem, userCode: string) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Provide a concise hint for problem ${problem.title}. User code:\n${userCode}`;
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.6 } });
        const result = await model.generateContent(prompt);
        return (result.response.text() || '').trim();
    }

    async codeReview(problem: Problem, userCode: string) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Code review for problem ${problem.title}. Code:\n${userCode}`;
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { temperature: 0.4 } });
        const result = await model.generateContent(prompt);
        return (result.response.text() || '').trim();
    }

    async performance(profile: { user: User, submissionStats: { total: number, accepted: number, acceptanceRate: number }, joinedGroups: Group[] }) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Analyze performance for user ${profile.user.username} with win rate ${profile.submissionStats.acceptanceRate.toFixed(1)}%`;
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { temperature: 0.5 } });
        const result = await model.generateContent(prompt);
        return (result.response.text() || '').trim();
    }



    async generateProblem(difficulty: string, topic: string) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Generate a new, unique, and interesting competitive programming problem.
        Difficulty: ${difficulty}
        Topic: ${topic}
        
        Ensure the problem description is engaging and clear. Provide at least 5 diverse test cases, including edge cases. Two of the test cases must be sample cases visible to the user. The solution should be optimal.`;

        const schema = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                description: { type: 'STRING' },
                difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard'] },
                constraints: { type: 'ARRAY', items: { type: 'STRING' } },
                inputFormat: { type: 'STRING' },
                outputFormat: { type: 'STRING' },
                testCases: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            input: { type: 'STRING' },
                            output: { type: 'STRING' },
                            isSample: { type: 'BOOLEAN' }
                        },
                        required: ['input', 'output', 'isSample']
                    }
                },
                solution: {
                    type: 'OBJECT',
                    properties: {
                        language: { type: 'STRING' },
                        code: { type: 'STRING' }
                    },
                    required: ['language', 'code']
                }
            },
            required: ['title', 'description', 'difficulty', 'constraints', 'inputFormat', 'outputFormat', 'testCases', 'solution']
        };

        const model = this.ai.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.8
            }
        });

        const result = await model.generateContent(prompt);

        const text = (result.response.text() || '').trim();
        const problem = JSON.parse(text);
        return { ...problem, id: new Date().toISOString(), status: 'Pending' } as Problem;
    }

    async explainConcept(concept: string) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Explain the following programming concept in a clear, beginner-friendly way: ${concept}`;
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.7 } });
        const result = await model.generateContent(prompt);
        return (result.response.text() || '').trim();
    }

    async summarizeDiscussion(messages: string[]) {
        if (!this.ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
        const prompt = `Summarize the following discussion points into key takeaways:\n${messages.join('\n')}`;
        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.5 } });
        const result = await model.generateContent(prompt);
        return (result.response.text() || '').trim();
    }

}
