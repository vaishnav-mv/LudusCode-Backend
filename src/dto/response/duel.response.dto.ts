import { UserResponseDTO } from './user.response.dto'
import { ProblemResponseDTO } from './problem.response.dto'
import { SubmissionStatus } from '../../types'

export interface DuelSubmissionDTO {
    id: string;
    user: UserResponseDTO | string;
    status: SubmissionStatus | string;
    userCode: string;
    executionTime: number;
    memoryUsage: number;
    attempts: number;
    codeHash?: string;
    submittedAt: number;
}

export interface DuelResponseDTO {
    id: string
    problem: ProblemResponseDTO
    player1: { user: UserResponseDTO | null; warnings: number }
    player2: { user: UserResponseDTO | null; warnings: number }
    status: string
    startTime: number
    winner?: UserResponseDTO | null
    wager?: number
    finalOverallStatus?: SubmissionStatus
    finalUserCode?: string
    submissions?: DuelSubmissionDTO[]
}
