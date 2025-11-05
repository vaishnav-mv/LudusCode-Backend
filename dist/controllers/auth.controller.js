"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const di_1 = __importDefault(require("../di"));
const responseHelper_1 = require("../utils/responseHelper");
const dtoMapper_1 = require("../utils/dtoMapper");
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Controller responsible for handling every authentication HTTP request.
 * Uses dependency injection to remain decoupled from the service layer.
 */
class AuthController {
    constructor() {
        /**
         * Handles user registration requests.
         * @param req - Express Request containing the new user's credentials in the body.
         * @param res - Express Response used to return the success message.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.registerUser = async (req, res, next) => {
            try {
                logger_1.default.info('Registration attempt started.');
                const result = await this._authService.registerUser(req.body);
                responseHelper_1.ApiResponse.success(res, result, 'Registration successful. Please verify your email.', constants_1.HttpStatus.CREATED);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Handles OTP verification and session establishment.
         * @param req - Express Request carrying `email` and `otp` in the body.
         * @param res - Express Response issuing auth cookies and returning the authenticated user DTO.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.verifyUserOTP = async (req, res, next) => {
            try {
                const { email, otp } = req.body;
                const { message, tokens, user } = await this._authService.verifyUserOTP(email, otp);
                this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
                responseHelper_1.ApiResponse.success(res, { user }, message ?? 'OTP verification successful', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        this.resendVerificationOtp = async (req, res, next) => {
            try {
                const { email } = req.body;
                const result = await this._authService.resendVerificationOtp(email);
                responseHelper_1.ApiResponse.success(res, result, 'OTP resent successfully', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Handles user login and cookie-based token issuance.
         * @param req - Express Request containing `email` and `password` in the body.
         * @param res - Express Response issuing auth cookies and returning the authenticated user DTO.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.loginUser = async (req, res, next) => {
            try {
                const { email, password } = req.body;
                const { tokens, user } = await this._authService.loginUser(email, password);
                this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
                responseHelper_1.ApiResponse.success(res, { user }, 'Login successful', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Refreshes the access token using the refresh-token cookie.
         * @param req - Express Request expecting the `refresh_token` cookie.
         * @param res - Express Response issuing updated auth cookies and returning the user DTO.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.refreshToken = async (req, res, next) => {
            try {
                const refreshToken = req.cookies?.refresh_token;
                if (!refreshToken) {
                    throw new AppError_1.default('Refresh token missing', constants_1.HttpStatus.UNAUTHORIZED);
                }
                const { tokens, user } = await this._authService.refreshToken(refreshToken);
                this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
                responseHelper_1.ApiResponse.success(res, { user }, 'Token refreshed successfully', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Retrieves the currently authenticated user's profile.
         * @param req - Express Request with the authenticated user attached by middleware.
         * @param res - Express Response returning the sanitized user DTO.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.getUserProfile = async (req, res, next) => {
            try {
                if (!req.user) {
                    throw new AppError_1.default('User not authenticated', constants_1.HttpStatus.UNAUTHORIZED);
                }
                const userDTO = dtoMapper_1.DTOMapper.toUserResponseDTO(req.user);
                responseHelper_1.ApiResponse.success(res, userDTO, 'Profile fetched successfully', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Logs out the current user by clearing authentication cookies.
         * @param _req - Express Request (unused).
         * @param res - Express Response confirming the logout action.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.logout = async (_req, res, next) => {
            try {
                this.clearAuthCookies(res);
                responseHelper_1.ApiResponse.success(res, null, 'Logged out successfully', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Initiates the forgot-password flow by issuing a reset OTP.
         * @param req - Express Request containing the user's email in the body.
         * @param res - Express Response returning the operation status.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.forgotPassword = async (req, res, next) => {
            try {
                const { email } = req.body;
                const result = await this._authService.forgotPassword(email);
                responseHelper_1.ApiResponse.success(res, result, 'If the account exists, a reset OTP has been sent.', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Completes the password reset after validating the provided OTP.
         * @param req - Express Request carrying `email`, `otp`, and `newPassword` in the body.
         * @param res - Express Response returning the operation status.
         * @param next - Express NextFunction used to delegate error handling.
         * @returns Promise<void>
         */
        this.resetPassword = async (req, res, next) => {
            try {
                const { email, otp, newPassword } = req.body;
                const result = await this._authService.resetPassword(email, otp, newPassword);
                responseHelper_1.ApiResponse.success(res, result, 'Password reset successful', constants_1.HttpStatus.OK);
            }
            catch (error) {
                next(error);
            }
        };
        this._authService = di_1.default.resolve('IAuthService');
    }
    /**
     * Persist the issued JWTs in HTTP-only cookies to shield them from XSS.
     */
    setAuthCookies(res, accessToken, refreshToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        const baseOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
        };
        res.cookie('access_token', accessToken, {
            ...baseOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.cookie('refresh_token', refreshToken, {
            ...baseOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
    }
    /**
     * Remove authentication cookies to terminate the session.
     */
    clearAuthCookies(res) {
        const isProduction = process.env.NODE_ENV === 'production';
        const options = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            path: '/',
        };
        res.clearCookie('access_token', options);
        res.clearCookie('refresh_token', options);
    }
}
exports.AuthController = AuthController;
exports.default = new AuthController();
