import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env'
import { singleton } from 'tsyringe'
import { IAiService } from '../interfaces/services'
import { ResponseMessages } from '../constants'

const ai = env.GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY }) : null
@singleton()
export class AiService implements IAiService {
  async hint(problem: any, userCode: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Provide a concise hint for problem ${problem.title}. User code:\n${userCode}`;
    const response = await (ai as any).models.generateContent({ model: 'gemini-1.5-flash', contents: prompt, config: { temperature: 0.6 } });
    return (response.text || '').trim();
  }

  async codeReview(problem: any, userCode: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Code review for problem ${problem.title}. Code:\n${userCode}`;
    const response = await (ai as any).models.generateContent({ model: 'gemini-1.5-pro', contents: prompt, config: { temperature: 0.4 } });
    return (response.text || '').trim();
  }

  async performance(profile: any) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Analyze performance for user ${profile.user.name} with win rate ${profile.submissionStats.acceptanceRate.toFixed(1)}%`;
    const response = await (ai as any).models.generateContent({ model: 'gemini-1.5-pro', contents: prompt, config: { temperature: 0.5 } });
    return (response.text || '').trim();
  }

  async judge(code: string, language: string, problem: any, testCases: any[]) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `
    You are a code judge. Evaluate the following ${language} code for the problem "${problem.title}".
    
    Problem Description:
    ${problem.description}

    User Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Test Cases:
    ${JSON.stringify(testCases)}

    For each test case, determine if the code produces the correct output.
    Return a JSON object with the following structure:
    {
      "overallStatus": "Accepted" | "Wrong Answer" | "Runtime Error" | "Time Limit Exceeded",
      "results": [
        {
          "testCase": (the test case object),
          "status": "Accepted" | "Wrong Answer" | "Runtime Error",
          "userOutput": (the output produced by the code, or error message)
        }
      ]
    }
    Do not include any markdown formatting or explanations, just the raw JSON.
    `;

    try {
      const response = await (ai as any).models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 }
      });
      const text = (response.text || '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('AI Judge failed:', error);
      return { overallStatus: 'Runtime Error', results: [] };
    }
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

    const response = await (ai as any).models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.8
      }
    });

    const text = (response.text || '').trim();
    const problem = JSON.parse(text);
    return { ...problem, id: new Date().toISOString(), status: 'Pending' };
  }

  async explainConcept(concept: string) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Explain the following programming concept in a clear, beginner-friendly way: ${concept}`;
    const response = await (ai as any).models.generateContent({ model: 'gemini-1.5-flash', contents: prompt, config: { temperature: 0.7 } });
    return (response.text || '').trim();
  }

  async summarizeDiscussion(messages: string[]) {
    if (!ai) throw new Error(ResponseMessages.AI_UNAVAILABLE);
    const prompt = `Summarize the following discussion points into key takeaways:\n${messages.join('\n')}`;
    const response = await (ai as any).models.generateContent({ model: 'gemini-1.5-flash', contents: prompt, config: { temperature: 0.5 } });
    return (response.text || '').trim();
  }

}
