import { Difficulty, ProblemStatus, TestCase, Solution, ParamSchema } from '../../types';

export interface ProblemResponseDTO {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty | string;
    constraints: string[];
    tags: string[];
    inputFormat: string;
    outputFormat: string;
    inputSchema: ParamSchema[];
    outputSchema: ParamSchema[];
    testCases: TestCase[];
    solutions?: Solution[];
    starterCode?: string;
    functionName?: string;
    editorial?: string;
    timeLimitMs: number;
    status: ProblemStatus | string;
}
