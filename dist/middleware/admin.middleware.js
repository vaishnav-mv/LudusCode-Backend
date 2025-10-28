"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = void 0;
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
/**
 * Middleware to authorize admin-only routes.
 * Checks if the authenticated user has the 'ADMIN' role.
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === constants_1.Role.Admin) {
        next();
    }
    else {
        next(new AppError_1.default('Not authorized as an admin', 403));
    }
};
exports.admin = admin;
