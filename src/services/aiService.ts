import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env'
import { singleton } from 'tsyringe'
import { IAiService } from '../interfaces/services'
import { ResponseMessages } from '../constants'
import { Problem } from '../types'

const ai: GoogleGenAI | null = env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY }) : null;
@singleton()
export class AiService implements IAiService {
  async hint(problem: any, userCode: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Provide a concise hint for problem ${problem.title}. User code:\n${userCode}`;
    const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.6 } });
    const response = await model.generateContent(prompt);
    return (response.text || '').trim();
  }

  async codeReview(problem: any, userCode: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Code review for problem ${problem.title}. Code:\n${userCode}`;
    const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { temperature: 0.4 } });
    const response = await model.generateContent(prompt);
    return (response.text || '').trim();
  }

  async performance(profile: any) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Analyze performance for user ${profile.user.name} with win rate ${profile.submissionStats.acceptanceRate.toFixed(1)}%`;
    const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-pro', generationConfig: { temperature: 0.5 } });
    const response = await model.generateContent(prompt);
    return (response.text || '').trim();
  }



  async generateProblem(difficulty: string, topic: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
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

    const model = (ai as any).getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema as any, // Schema type might imply exact structure matches Google's
        temperature: 0.8
      }
    });

    const response = await model.generateContent(prompt);

    const text = (response.text || '').trim();
    const problem = JSON.parse(text);
    return { ...problem, id: new Date().toISOString(), status: 'Pending' } as Problem;
  }

  async explainConcept(concept: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Explain the following programming concept in a clear, beginner-friendly way: ${concept}`;
    const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.7 } });
    const response = await model.generateContent(prompt);
    return (response.text || '').trim();
  }

  async summarizeDiscussion(messages: string[]) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Summarize the following discussion points into key takeaways:\n${messages.join('\n')}`;
    const model = (ai as any).getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { temperature: 0.5 } });
    const response = await model.generateContent(prompt);
    return (response.text || '').trim();
  }

}
