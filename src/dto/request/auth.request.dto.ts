import { z } from 'zod';

export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

export type LoginRequestDTO = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
    username: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
});

export type RegisterRequestDTO = z.infer<typeof RegisterSchema>;

export const VerifyOtpSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6)
});

export type VerifyOtpRequestDTO = z.infer<typeof VerifyOtpSchema>;

export const ResendOtpSchema = z.object({
    email: z.string().email()
});

export type ResendOtpRequestDTO = z.infer<typeof ResendOtpSchema>;

export const ForgotPasswordSchema = z.object({
    email: z.string().email()
});

export type ForgotPasswordRequestDTO = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
    newPassword: z.string().min(6)
});

export type ResetPasswordRequestDTO = z.infer<typeof ResetPasswordSchema>;

// Social Login
export const SocialLoginSchema = z.object({
    provider: z.string()
});
export type SocialLoginRequestDTO = z.infer<typeof SocialLoginSchema>;
