import { z } from 'zod'

export const DepositSchema = z.object({
    userId: z.string(),
    amount: z.number().positive()
})
export type DepositDTO = z.infer<typeof DepositSchema>

export const WithdrawSchema = z.object({
    userId: z.string(),
    amount: z.number().positive()
})
export type WithdrawDTO = z.infer<typeof WithdrawSchema>

export const WagerSchema = z.object({
    userId: z.string(),
    amount: z.number().positive(),
    description: z.string()
})
export type WagerDTO = z.infer<typeof WagerSchema>

export const WinSchema = z.object({
    userId: z.string(),
    amount: z.number().positive(),
    description: z.string()
})
export type WinDTO = z.infer<typeof WinSchema>
