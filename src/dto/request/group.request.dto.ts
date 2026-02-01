import { z } from 'zod'

export const CreateGroupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    isPrivate: z.boolean().optional(),
    topics: z.array(z.string()).optional()
})
export type CreateGroupDTO = z.infer<typeof CreateGroupSchema>

export const UpdateGroupSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().min(1).optional()
})
export type UpdateGroupDTO = z.infer<typeof UpdateGroupSchema>

export const GroupMemberActionSchema = z.object({
    userId: z.string()
})
export type GroupMemberActionDTO = z.infer<typeof GroupMemberActionSchema>

export const AddMemberSchema = z.object({
    userId: z.string()
})
export type AddMemberDTO = z.infer<typeof AddMemberSchema>
