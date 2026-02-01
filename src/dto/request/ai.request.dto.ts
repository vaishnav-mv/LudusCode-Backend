import { z } from 'zod'

export const HintSchema = z.object({
    problemId: z.string(),
    userCode: z.string()
})
export type HintDTO = z.infer<typeof HintSchema>

export const CodeReviewSchema = z.object({
    problemId: z.string(),
    userCode: z.string()
})
export type CodeReviewDTO = z.infer<typeof CodeReviewSchema>

export const PerformanceSchema = z.object({
    userId: z.string()
})
export type PerformanceDTO = z.infer<typeof PerformanceSchema>
