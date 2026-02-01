import { z } from 'zod'

export const ExecuteSchema = z.object({
    problemId: z.string(),
    userCode: z.string(),
    language: z.string(),
    customInputs: z.array(z.string()).optional()
})
export type ExecuteDTO = z.infer<typeof ExecuteSchema>
