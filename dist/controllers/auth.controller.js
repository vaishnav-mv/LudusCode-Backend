"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const tsyringe_1 = require("tsyringe");
const responseHelper_1 = require("../utils/responseHelper");
const dtoMapper_1 = require("../utils/dtoMapper");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Controller to handle all authentication-related requests.
 */
class AuthController {
    constructor() {
        this._authService = tsyringe_1.container.resolve('IAuthService');
    }
    /**
     * Handles user registration requests.
     * @param req - Express Request containing user data in `body`.
     * @param res - Express Response used to send status and payload.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async registerUser(req, res, next) {
        try {
            logger_1.default.info('Registration attempt started.');
            const result = await this._authService.registerUser(req.body);
            responseHelper_1.ApiResponse.success(res, result, 'Registration successful', 201);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handles OTP verification requests.
     * @param req - Express Request with `email` and `otp` in `body`.
     * @param res - Express Response used to send verification result.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async verifyUserOTP(req, res, next) {
        try {
            const { email, otp } = req.body;
            const result = await this._authService.verifyUserOTP(email, otp);
            responseHelper_1.ApiResponse.success(res, result, 'OTP verification successful');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handles user login requests.
     * @param req - Express Request with `email` and `password` in `body`.
     * @param res - Express Response used to send token and user payload.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async loginUser(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await this._authService.loginUser(email, password);
            responseHelper_1.ApiResponse.success(res, result, 'Login successful');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handles requests to fetch the current user's profile.
     * @param req - Express Request with `user` attached by auth middleware.
     * @param res - Express Response used to send the user DTO.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async getUserProfile(req, res, next) {
        try {
            const userDTO = dtoMapper_1.DTOMapper.toUserResponseDTO(req.user);
            responseHelper_1.ApiResponse.success(res, userDTO, 'Profile fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handles password reset requests.
     * @param req - Express Request with `email` in `body`.
     * @param res - Express Response with the service response.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const result = await this._authService.forgotPassword(email);
            responseHelper_1.ApiResponse.success(res, result, 'Password reset OTP sent successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handles password reset with OTP verification.
     * @param req - Express Request with `email`, `otp`, and `newPassword` in `body`.
     * @param res - Express Response with the service response.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async resetPassword(req, res, next) {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await this._authService.resetPassword(email, otp, newPassword);
            responseHelper_1.ApiResponse.success(res, result, 'Password reset successful');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
