"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
const validateRequest = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        const errorMessage = error.errors.map((e) => e.message).join(', ');
        next(new AppError_1.default(`Validation failed: ${errorMessage}`, constants_1.HttpStatus.BAD_REQUEST));
    }
};
exports.validateRequest = validateRequest;
