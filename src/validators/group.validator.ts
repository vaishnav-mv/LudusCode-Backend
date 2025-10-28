import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, 'Group name must be at least 3 characters long')
    .max(50, 'Group name cannot exceed 50 characters'),
});
