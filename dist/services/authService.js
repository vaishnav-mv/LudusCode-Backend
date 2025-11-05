"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const tsyringe_1 = require("tsyringe");
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
const dtoMapper_1 = require("../utils/dtoMapper");
let AuthService = class AuthService {
    constructor(_userRepository, _otpService, _emailService, _jwtService) {
        this._userRepository = _userRepository;
        this._otpService = _otpService;
        this._emailService = _emailService;
        this._jwtService = _jwtService;
    }
    /**
     * Registers a new user and sends a verification OTP
     * @param userData - User registration data
     * @returns Promise with success message
     */
    async registerUser(userData) {
        const { username, email, password } = userData;
        if (!username || !email || !password) {
            throw new AppError_1.default('Please provide username, email, and password', constants_1.HttpStatus.BAD_REQUEST);
        }
        // Check if user already exists
        const existingUser = await this._userRepository.findByEmail(email);
        if (existingUser) {
            throw new AppError_1.default('Email already registered', constants_1.HttpStatus.CONFLICT);
        }
        const existingUsername = await this._userRepository.findOne({ username });
        if (existingUsername) {
            throw new AppError_1.default('Username is already taken', constants_1.HttpStatus.CONFLICT);
        }
        // Generate and send OTP
        const otp = await this._otpService.generateOtp(email, 'verification');
        try {
            await this._emailService.sendOtpEmail(email, otp, 'verification');
        }
        catch (error) {
            await this._otpService.invalidateOtp(email, 'verification');
            logger_1.default.error(`Failed to send verification email to ${email}:`, error);
            throw new AppError_1.default('Failed to send verification email. Please try again later.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        // Create user after successful email sending
        await this._userRepository.create({
            username,
            name: userData.name || username,
            email,
            password,
        });
        logger_1.default.info(`User registered and verification email sent to ${email}`);
        return { message: 'Registration successful. Please check your email for an OTP.' };
    }
    /**
     * Verifies user's OTP and activates the account
     * @param email - User's email
     * @param otp - One-time password
     * @returns User data and authentication tokens
     */
    async verifyUserOTP(email, otp) {
        if (!email || !otp) {
            throw new AppError_1.default('Please provide email and OTP', constants_1.HttpStatus.BAD_REQUEST);
        }
        // Verify OTP
        const isValid = await this._otpService.verifyOtp(email, otp, 'verification');
        if (!isValid) {
            throw new AppError_1.default('Invalid or expired OTP', constants_1.HttpStatus.BAD_REQUEST);
        }
        // Get and verify user
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found', constants_1.HttpStatus.NOT_FOUND);
        }
        // Update verification status
        user.isVerified = true;
        await user.save();
        // Generate tokens
        const accessToken = this._jwtService.generateAccessToken(user._id.toString(), user.role);
        const refreshToken = this._jwtService.generateRefreshToken(user._id.toString(), user.role);
        const userDTO = dtoMapper_1.DTOMapper.toUserResponseDTO(user);
        return {
            message: 'Account verified successfully',
            tokens: {
                accessToken,
                refreshToken,
            },
            user: userDTO,
        };
    }
    async resendVerificationOtp(email) {
        if (!email) {
            throw new AppError_1.default('Please provide an email address', constants_1.HttpStatus.BAD_REQUEST);
        }
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found', constants_1.HttpStatus.NOT_FOUND);
        }
        if (user.isVerified) {
            throw new AppError_1.default('User is already verified', constants_1.HttpStatus.BAD_REQUEST);
        }
        const otp = await this._otpService.generateOtp(email, 'verification');
        try {
            await this._emailService.sendOtpEmail(email, otp, 'verification');
        }
        catch (error) {
            await this._otpService.invalidateOtp(email, 'verification');
            logger_1.default.error(`Failed to resend verification email to ${email}:`, error);
            throw new AppError_1.default('Failed to resend verification email. Please try again later.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { message: 'OTP resent successfully. Please check your email.' };
    }
    /**
     * Authenticates a user and generates tokens
     * @param email - User's email
     * @param password - User's password
     * @returns User data and authentication tokens
     */
    async loginUser(email, password) {
        if (!email || !password) {
            throw new AppError_1.default('Please provide email and password', constants_1.HttpStatus.BAD_REQUEST);
        }
        // Find user with password
        const user = await this._userRepository.findByEmail(email, '+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new AppError_1.default('Invalid credentials', constants_1.HttpStatus.UNAUTHORIZED);
        }
        if (!user.isVerified) {
            throw new AppError_1.default('Please verify your email first', constants_1.HttpStatus.FORBIDDEN);
        }
        // Generate tokens
        const accessToken = this._jwtService.generateAccessToken(user._id.toString(), user.role);
        const refreshToken = this._jwtService.generateRefreshToken(user._id.toString(), user.role);
        const userDTO = dtoMapper_1.DTOMapper.toUserResponseDTO(user);
        return {
            tokens: {
                accessToken,
                refreshToken,
            },
            user: userDTO,
        };
    }
    /**
     * Refreshes an access token using a refresh token
     * @param refreshToken - Refresh token
     * @returns New access token and user data
     */
    async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new AppError_1.default('Refresh token is required', constants_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const payload = this._jwtService.verifyRefreshToken(refreshToken);
            const user = await this._userRepository.findById(payload.id);
            if (!user) {
                throw new AppError_1.default('User not found', constants_1.HttpStatus.NOT_FOUND);
            }
            const newAccessToken = this._jwtService.generateAccessToken(user._id.toString(), user.role);
            const userDTO = dtoMapper_1.DTOMapper.toUserResponseDTO(user);
            return {
                tokens: {
                    accessToken: newAccessToken,
                    refreshToken,
                },
                user: userDTO,
            };
        }
        catch (error) {
            throw new AppError_1.default('Invalid or expired refresh token', constants_1.HttpStatus.UNAUTHORIZED);
        }
    }
    /**
     * Initiates password reset process
     * @param email - User's email
     * @returns Success message
     */
    async forgotPassword(email) {
        if (!email) {
            throw new AppError_1.default('Please provide an email address', constants_1.HttpStatus.BAD_REQUEST);
        }
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists for security
            return {
                message: 'If an account exists with this email, a password reset OTP has been sent'
            };
        }
        const otp = await this._otpService.generateOtp(email, 'password-reset');
        try {
            await this._emailService.sendOtpEmail(email, otp, 'password-reset');
            return {
                message: 'Password reset OTP sent to your email'
            };
        }
        catch (error) {
            await this._otpService.invalidateOtp(email, 'password-reset');
            logger_1.default.error(`Failed to send password reset email to ${email}:`, error);
            throw new AppError_1.default('Failed to send password reset email. Please try again later.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Resets user's password using OTP
     * @param email - User's email
     * @param otp - One-time password
     * @param newPassword - New password
     * @returns Success message
     */
    async resetPassword(email, otp, newPassword) {
        if (!email || !otp || !newPassword) {
            throw new AppError_1.default('Please provide email, OTP, and new password', constants_1.HttpStatus.BAD_REQUEST);
        }
        const isValid = await this._otpService.verifyOtp(email, otp, 'password-reset');
        if (!isValid) {
            throw new AppError_1.default('Invalid or expired OTP', constants_1.HttpStatus.BAD_REQUEST);
        }
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found', constants_1.HttpStatus.NOT_FOUND);
        }
        // Update password (hashing is handled by the pre-save hook)
        user.password = newPassword;
        await user.save();
        // Invalidate the used OTP
        await this._otpService.invalidateOtp(email, 'password-reset');
        return { message: 'Password reset successful' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __param(1, (0, tsyringe_1.inject)('IOtpService')),
    __param(2, (0, tsyringe_1.inject)('IEmailService')),
    __param(3, (0, tsyringe_1.inject)('IJwtService')),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], AuthService);
