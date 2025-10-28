"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        // Ensure the prototype is correctly set
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.default = AppError;
