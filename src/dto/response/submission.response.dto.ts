import { SubmissionStatus, TestCaseResult, Problem } from '../../types';

export interface SubmissionResponseDTO {
    id: string;
    problem: Partial<Problem> & { id: string };
    userCode: string;
    result: {
        overallStatus: SubmissionStatus;
        results: TestCaseResult[];
        executionTime: number;
        memoryUsage: number;
    };
    submittedAt: Date | string;
}
