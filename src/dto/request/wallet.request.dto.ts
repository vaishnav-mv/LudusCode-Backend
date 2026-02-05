import { z } from 'zod'

export const DepositSchema = z.object({
    userId: z.string(),
    amount: z.number().positive()
})
export type DepositDTO = z.infer<typeof DepositSchema>

export const WithdrawSchema = z.object({
    userId: z.string(),
    amount: z.number().positive(),
    vpa: z.string().min(3)
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

export const VerifySchema = z.object({
    userId: z.string(),
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string()
})
export type VerifyDTO = z.infer<typeof VerifySchema>
