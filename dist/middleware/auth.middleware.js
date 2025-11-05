"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tsyringe_1 = require("tsyringe");
const config_1 = __importDefault(require("../config"));
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware to protect routes by verifying the JWT.
 * It decodes the token, finds the user, and attaches them to the request object.
 */
const protect = async (req, res, next) => {
    let token;
    try {
        // Prefer the access token cookie issued by AuthController, fall back to legacy name if present
        token = req.cookies?.access_token || req.cookies?.auth_token;
        if (!token) {
            throw new AppError_1.default('Not authorized, no token', constants_1.HttpStatus.UNAUTHORIZED);
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const userRepository = tsyringe_1.container.resolve('IUserRepository');
        const user = await userRepository.findById(decoded.id);
        if (!user) {
            return next(new AppError_1.default('Not authorized, user not found', constants_1.HttpStatus.UNAUTHORIZED));
        }
        req.user = user;
        next();
    }
    catch (error) {
        // Enhanced error logging with context
        const errorContext = {
            token: token ? token.substring(0, 10) + '...' : 'none',
            ip: req.ip,
            path: req.path,
            method: req.method,
        };
        // Distinguish between expired and invalid tokens
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger_1.default.warn('Token expired:', errorContext);
            next(new AppError_1.default('Session expired. Please login again.', constants_1.HttpStatus.UNAUTHORIZED));
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger_1.default.warn('Invalid token:', errorContext);
            next(new AppError_1.default('Invalid authentication token.', constants_1.HttpStatus.UNAUTHORIZED));
        }
        else {
            logger_1.default.error('Authentication error:', { ...errorContext, error });
            next(new AppError_1.default('Authentication failed. Please try again.', constants_1.HttpStatus.UNAUTHORIZED));
        }
    }
};
exports.protect = protect;
