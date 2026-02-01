import { z } from 'zod'

export const ForceDuelResultSchema = z.object({
    winnerId: z.string()
})
export type ForceDuelResultDTO = z.infer<typeof ForceDuelResultSchema>

export const AdminNoBodySchema = z.object({})
export type AdminNoBodyDTO = z.infer<typeof AdminNoBodySchema>
