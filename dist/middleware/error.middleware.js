"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = __importDefault(require("../utils/AppError"));
const responseHelper_1 = require("../utils/responseHelper");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Global error handling middleware for the Express application.
 * It catches errors, logs them, and sends a standardized JSON response.
 *
 * @param err - The error object.
 * @param req - The Express Request object.
 * @param res - The Express Response object.
 * @param _next - The Express NextFunction (unused).
 */
const errorHandler = (err, req, res, _next) => {
    // Log the error for debugging purposes
    logger_1.default.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });
    if (err instanceof AppError_1.default) {
        responseHelper_1.ApiResponse.error(res, err.message, err.statusCode);
    }
    else {
        // For unexpected errors, send a generic message
        responseHelper_1.ApiResponse.error(res, 'An internal server error occurred', 500);
    }
};
exports.errorHandler = errorHandler;
