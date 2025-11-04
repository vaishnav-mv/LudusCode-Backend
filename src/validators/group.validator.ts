import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, 'Group name must be at least 3 characters long')
    .max(50, 'Group name cannot exceed 50 characters'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  topics: z
    .array(z.string())
    .max(10, 'Cannot have more than 10 topics')
    .optional(),
});
