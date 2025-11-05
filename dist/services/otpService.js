"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const tsyringe_1 = require("tsyringe");
const redis_1 = __importDefault(require("../config/redis"));
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
/**
 * Service for handling OTP (One-Time Password) operations using Redis
 */
let OtpService = class OtpService {
    constructor() {
        // Default expiration time for OTPs in seconds (10 minutes)
        this._otpExpirationSeconds = 600;
        // Redis key prefix for OTPs
        this._keyPrefix = 'otp:';
        // Rate limiting: max 3 OTP requests per 15 minutes
        this._maxOtpRequests = 3;
        this._rateLimitWindowSeconds = 900; // 15 minutes
        // Brute force protection: max 5 failed attempts
        this._maxVerificationAttempts = 5;
        this._lockoutDurationSeconds = 1800; // 30 minutes
    }
    /**
     * Generate a new OTP for a user
     * @param email User's email address
     * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
     * @returns The generated OTP code
     */
    async generateOtp(email, purpose = 'verification') {
        if (!email) {
            throw new AppError_1.default('Email is required for OTP', constants_1.HttpStatus.BAD_REQUEST);
        }
        try {
            // Check rate limiting
            const rateLimitKey = `otp:ratelimit:${email}:${purpose}`;
            const requestCount = await redis_1.default.get(rateLimitKey);
            if (requestCount && parseInt(requestCount) >= this._maxOtpRequests) {
                logger_1.default.warn(`Rate limit exceeded for ${email} (${purpose})`);
                throw new AppError_1.default('Too many OTP requests. Please try again in 15 minutes.', constants_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            // Increment rate limit counter
            const newCount = await redis_1.default.incr(rateLimitKey);
            if (newCount === 1) {
                // Set expiration only on first request
                await redis_1.default.expire(rateLimitKey, this._rateLimitWindowSeconds);
            }
            // Generate and store OTP
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const key = this._createKey(email, purpose);
            await redis_1.default.setEx(key, this._otpExpirationSeconds, otp);
            logger_1.default.info(`[OTP] ${purpose} OTP for ${email}: ${otp} (Requests ${newCount}/${this._maxOtpRequests})`);
            return otp;
        }
        catch (error) {
            if (error instanceof AppError_1.default)
                throw error;
            logger_1.default.error('Error storing OTP in Redis:', error);
            throw new AppError_1.default('Failed to generate OTP. Please try again.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Verify an OTP for a user
     * @param email User's email address
     * @param code OTP code to verify
     * @param purpose Purpose of the OTP
     * @returns Boolean indicating if OTP is valid
     */
    async verifyOtp(email, code, purpose = 'verification') {
        if (!email || !code) {
            throw new AppError_1.default('Email and OTP code are required', constants_1.HttpStatus.BAD_REQUEST);
        }
        if (!/^\d{6}$/.test(code)) {
            throw new AppError_1.default('Invalid OTP format', constants_1.HttpStatus.BAD_REQUEST);
        }
        try {
            // Check if account is locked due to too many failed attempts
            const attemptsKey = `otp:attempts:${email}:${purpose}`;
            const attempts = await redis_1.default.get(attemptsKey);
            if (attempts && parseInt(attempts) >= this._maxVerificationAttempts) {
                logger_1.default.warn(`Account locked for ${email} (${purpose}) due to too many failed attempts`);
                throw new AppError_1.default('Too many failed attempts. Account locked for 30 minutes.', constants_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            // Verify OTP
            const key = this._createKey(email, purpose);
            const storedOtp = await redis_1.default.get(key);
            if (!storedOtp || storedOtp !== code) {
                // Increment failed attempts counter
                const newAttempts = await redis_1.default.incr(attemptsKey);
                if (newAttempts === 1) {
                    // Set expiration on first failed attempt
                    await redis_1.default.expire(attemptsKey, this._lockoutDurationSeconds);
                }
                logger_1.default.info(`Invalid OTP attempt for ${email} (${purpose}). Attempts: ${newAttempts}/${this._maxVerificationAttempts}`);
                return false;
            }
            // Success: delete OTP and reset attempts counter
            await redis_1.default.del(key);
            await redis_1.default.del(attemptsKey);
            logger_1.default.info(`OTP verified successfully for ${email} (${purpose})`);
            return true;
        }
        catch (error) {
            if (error instanceof AppError_1.default)
                throw error;
            logger_1.default.error('Error verifying OTP in Redis:', error);
            throw new AppError_1.default('OTP verification failed. Please try again.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Invalidate an existing OTP
     * @param email User's email address
     * @param purpose Purpose of the OTP
     */
    async invalidateOtp(email, purpose = 'verification') {
        if (!email) {
            throw new AppError_1.default('Email is required to invalidate OTP', constants_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const key = this._createKey(email, purpose);
            await redis_1.default.del(key);
            logger_1.default.info(`OTP invalidated for ${email} (${purpose})`);
        }
        catch (error) {
            logger_1.default.error('Error invalidating OTP in Redis:', error);
            throw new AppError_1.default('Failed to invalidate OTP. Please try again.', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Create a Redis key for storing OTP
     * @param email User's email
     * @param purpose OTP purpose
     * @returns Formatted Redis key
     */
    _createKey(email, purpose) {
        return `${this._keyPrefix}${email}:${purpose}`;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, tsyringe_1.injectable)()
], OtpService);
exports.default = OtpService;
