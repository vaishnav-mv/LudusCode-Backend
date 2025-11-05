"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3, 'Group name must be at least 3 characters long')
        .max(50, 'Group name cannot exceed 50 characters'),
    description: zod_1.z
        .string()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
    topics: zod_1.z
        .array(zod_1.z.string())
        .max(10, 'Cannot have more than 10 topics')
        .optional(),
});
