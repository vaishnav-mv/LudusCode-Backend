import { z } from 'zod';

export const UpdateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional()
});

export type UpdateProfileRequestDTO = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string().min(6)
});

export type ChangePasswordRequestDTO = z.infer<typeof ChangePasswordSchema>;
