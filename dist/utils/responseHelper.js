"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
/**
 * A helper class to create and send standardized API responses.
 */
class ApiResponse {
    /**
     * Sends a success response.
     * @param res - The Express Response object.
     * @param data - The payload to be sent.
     * @param message - A descriptive message.
     * @param statusCode - The HTTP status code.
     */
    static success(res, data, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            message,
            data,
            statusCode,
        };
        res.status(statusCode).json(response);
    }
    /**
     * Sends an error response.
     * @param res - The Express Response object.
     * @param message - The error message.
     * @param statusCode - The HTTP status code.
     */
    static error(res, message = 'An error occurred', statusCode = 500) {
        const response = {
            success: false,
            message,
            data: null,
            statusCode,
        };
        res.status(statusCode).json(response);
    }
}
exports.ApiResponse = ApiResponse;
