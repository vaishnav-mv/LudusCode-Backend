"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
// FIX: Corrected import casing to point to the class-based repository
const UserRepository_1 = __importDefault(require("../repositories/UserRepository"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new AppError_1.default('Not authorized, no token', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const user = await UserRepository_1.default.findById(decoded.id, '-password');
        if (!user) {
            return next(new AppError_1.default('Not authorized, user not found', 401));
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error(error);
        if (error instanceof AppError_1.default) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
exports.protect = protect;
