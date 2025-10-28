"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const AppError_1 = __importDefault(require("../utils/AppError"));
/**
 * Middleware to validate the request body against a Zod schema.
 * @param schema - The Zod schema to validate against.
 * @returns An Express middleware function.
 */
const validateRequest = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        const errorMessage = error.errors.map((e) => e.message).join(', ');
        next(new AppError_1.default(`Validation failed: ${errorMessage}`, 400));
    }
};
exports.validateRequest = validateRequest;
