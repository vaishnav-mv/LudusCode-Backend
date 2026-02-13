import { z } from 'zod'

export const CreateDuelSchema = z.object({
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    wager: z.number().int().nonnegative(),
    player2Id: z.string()
})
export type CreateDuelDTO = z.infer<typeof CreateDuelSchema>

export const UpdateDuelStateSchema = z.object({
    status: z.enum(['Waiting', 'In Progress', 'Finished', 'Cancelled']),
    winnerId: z.string().optional()
})
export type UpdateDuelStateDTO = z.infer<typeof UpdateDuelStateSchema>

export const CreateOpenChallengeSchema = z.object({
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    wager: z.number().int().nonnegative(),
    playerId: z.string()
})
export type CreateOpenChallengeDTO = z.infer<typeof CreateOpenChallengeSchema>

export const DuelPlayerActionSchema = z.object({
    playerId: z.string()
})
export type DuelPlayerActionDTO = z.infer<typeof DuelPlayerActionSchema>

export const SetSummarySchema = z.object({
    finalOverallStatus: z.string().optional(),
    finalUserCode: z.string().optional()
})
export type SetSummaryDTO = z.infer<typeof SetSummarySchema>

export const FinishDuelSchema = z.object({
    winnerId: z.string().optional(),
    finalOverallStatus: z.string().optional(),
    finalUserCode: z.string().optional()
})
export type FinishDuelDTO = z.infer<typeof FinishDuelSchema>

export const SubmitDuelResultSchema = z.object({
    playerId: z.string(),
    result: z.object({
        overallStatus: z.enum(['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Disqualified']),
        executionTime: z.number().nonnegative(),
        memoryUsage: z.number().nonnegative().optional(),
        attempts: z.number().int().nonnegative().optional()
    }).optional(),
    userCode: z.string()
})
export type SubmitDuelResultDTO = z.infer<typeof SubmitDuelResultSchema>
