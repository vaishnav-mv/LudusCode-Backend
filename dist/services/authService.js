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
const token_1 = require("../utils/token");
const AppError_1 = __importDefault(require("../utils/AppError"));
const logger_1 = __importDefault(require("../utils/logger"));
// removed: import { UserRepository } from '../repositories/userRepository';
let AuthService = class AuthService {
    constructor(_userRepository, _otpService, _emailService) {
        this._userRepository = _userRepository;
        this._otpService = _otpService;
        this._emailService = _emailService;
    }
    async registerUser(userData) {
        const { username, email, password } = userData;
        if (!username || !email || !password) {
            throw new AppError_1.default('Please provide username, email and password', 400);
        }
        const userExists = await this._userRepository.findByEmail(email);
        if (userExists) {
            throw new AppError_1.default('User already exists', 400);
        }
        // The password will be hashed by the pre-save hook in the model
        await this._userRepository.create({ username, email, password });
        // Generate OTP and store in Redis
        const otp = await this._otpService.generateOtp(email, 'verification');
        // Send OTP email to user
        await this._emailService.sendOtpEmail(email, otp, 'verification');
        // Avoid logging raw OTP values
        logger_1.default.info(`OTP generated and email sent to ${email}`);
        return { message: 'Registration successful. Please check your email for an OTP.' };
    }
    async verifyUserOTP(email, otp) {
        if (!email || !otp) {
            throw new AppError_1.default('Please provide email and otp', 400);
        }
        // Verify OTP from Redis
        const isValid = await this._otpService.verifyOtp(email, otp, 'verification');
        if (!isValid) {
            throw new AppError_1.default('Invalid OTP or OTP has expired.', 400);
        }
        // Update user verification status
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found', 404);
        }
        user.isVerified = true;
        await user.save();
        return { message: 'Account verified successfully.' };
    }
    async loginUser(email, password) {
        if (!email || !password) {
            throw new AppError_1.default('Please provide email and password', 400);
        }
        const user = await this._userRepository.findByEmail(email, '+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new AppError_1.default('Invalid credentials', 401);
        }
        if (!user.isVerified) {
            throw new AppError_1.default('Account not verified. Please check your email for an OTP.', 401);
        }
        // Return a user object without the password
        const userObject = user.toObject();
        delete userObject.password;
        return {
            token: (0, token_1.generateToken)(user._id.toString()),
            user: userObject,
        };
    }
    async forgotPassword(email) {
        if (!email) {
            throw new AppError_1.default('Please provide email', 400);
        }
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found with this email', 404);
        }
        // Generate OTP for password reset and store in Redis
        await this._otpService.generateOtp(email, 'password-reset');
        // Avoid logging raw OTP values
        logger_1.default.info(`Password reset OTP generated for ${email}`);
        return { message: 'Password reset OTP sent to your email.' };
    }
    async resetPassword(email, otp, newPassword) {
        if (!email || !otp || !newPassword) {
            throw new AppError_1.default('Please provide email, otp and new password', 400);
        }
        // Verify OTP from Redis
        const isValid = await this._otpService.verifyOtp(email, otp, 'password-reset');
        if (!isValid) {
            throw new AppError_1.default('Invalid OTP or OTP has expired.', 400);
        }
        const user = await this._userRepository.findByEmail(email);
        if (!user) {
            throw new AppError_1.default('User not found', 404);
        }
        user.password = newPassword;
        await user.save();
        return { message: 'Password reset successful.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __param(1, (0, tsyringe_1.inject)('IOtpService')),
    __param(2, (0, tsyringe_1.inject)('IEmailService')),
    __metadata("design:paramtypes", [Object, Object, Object])
], AuthService);
