import { z } from 'zod'

export const CreateCompetitionSchema = z.object({
    groupId: z.string(),
    title: z.string().min(1),
    startTime: z.string(),
    durationMinutes: z.number().int().positive(),
    problemCounts: z.object({
        easy: z.number().int().nonnegative(),
        medium: z.number().int().nonnegative(),
        hard: z.number().int().nonnegative()
    })
})
export type CreateCompetitionDTO = z.infer<typeof CreateCompetitionSchema>

export const SubmitProblemSchema = z.object({
    competitionId: z.string(),
    userId: z.string(),
    problemId: z.string(),
    points: z.number().int().positive(),
    userCode: z.string()
})
export type SubmitProblemDTO = z.infer<typeof SubmitProblemSchema>

export const HintSchema = z.object({
    competitionId: z.string(),
    userId: z.string(),
    problemId: z.string(),
    userCode: z.string()
})
export type HintDTO = z.infer<typeof HintSchema>
