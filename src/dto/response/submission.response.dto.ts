import { SubmissionStatus, TestCaseResult } from '../../types';
import { ProblemResponseDTO } from './problem.response.dto';

export interface SubmissionResponseDTO {
    id: string;
    problem: ProblemResponseDTO;
    userCode: string;
    result: {
        overallStatus: SubmissionStatus;
        results: TestCaseResult[];
        executionTime: number;
        memoryUsage: number;
    };
    submittedAt: Date | string;
}
