import { UserResponseDTO } from './user.response.dto'
import { Problem, SubmissionStatus } from '../../types'

export interface DuelResponseDTO {
    id: string
    problem: Problem
    player1: { user: UserResponseDTO | null; warnings: number }
    player2: { user: UserResponseDTO | null; warnings: number }
    status: string
    startTime: number
    winner?: UserResponseDTO | null
    wager?: number
    finalOverallStatus?: SubmissionStatus
    finalUserCode?: string
    submissions?: any[]
}
