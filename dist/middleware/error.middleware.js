"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = __importDefault(require("../utils/AppError"));
const constants_1 = require("../constants");
const responseHelper_1 = require("../utils/responseHelper");
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, _next) => {
    // Log the error for debugging purposes
    logger_1.default.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });
    if (err instanceof AppError_1.default) {
        responseHelper_1.ApiResponse.error(res, err.message, err.statusCode);
    }
    else {
        // For unexpected errors, send a generic message
        responseHelper_1.ApiResponse.error(res, 'An internal server error occurred', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
    }
};
exports.errorHandler = errorHandler;
