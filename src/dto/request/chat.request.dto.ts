import { z } from 'zod'

export const SendMessageSchema = z.object({
    userId: z.string(),
    text: z.string().min(1)
})
export type SendMessageDTO = z.infer<typeof SendMessageSchema>
