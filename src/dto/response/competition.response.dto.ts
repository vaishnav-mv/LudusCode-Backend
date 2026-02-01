import { UserResponseDTO } from './user.response.dto'
import { Problem, CompetitionStatus, ParticipantProblemStatus } from '../../types'

export interface CompetitionResponseDTO {
    id: string
    groupId: string
    title: string
    startTime: string
    durationMinutes: number
    problems: {
        problem: Problem
        points: number
    }[]
    participants: {
        user: UserResponseDTO
        score: number
        rank: number
        problemStatus: Record<string, ParticipantProblemStatus>
    }[]
    status: CompetitionStatus
}
