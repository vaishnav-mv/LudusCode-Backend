"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tsyringe_1 = require("tsyringe");
const config_1 = __importDefault(require("../config"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to protect routes by verifying the JWT.
 * It decodes the token, finds the user, and attaches them to the request object.
 */
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new AppError_1.default('Not authorized, no token provided', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const userRepository = tsyringe_1.container.resolve('IUserRepository');
        const user = await userRepository.findById(decoded.id);
        if (!user) {
            return next(new AppError_1.default('Not authorized, user not found', 401));
        }
        req.user = user;
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        next(new AppError_1.default('Not authorized, token failed', 401));
    }
};
exports.protect = protect;
