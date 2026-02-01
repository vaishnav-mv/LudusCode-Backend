import { z } from 'zod'

export const GenerateProblemSchema = z.object({
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    topic: z.string()
})
export type GenerateProblemDTO = z.infer<typeof GenerateProblemSchema>
