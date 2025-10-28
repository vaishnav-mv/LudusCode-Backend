"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3, 'Group name must be at least 3 characters long')
        .max(50, 'Group name cannot exceed 50 characters'),
});
