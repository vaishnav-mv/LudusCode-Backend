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
    }
    /**
     * Generate a new OTP for a user
     * @param email User's email address
     * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
     * @returns The generated OTP code
     */
    async generateOtp(email, purpose = 'verification') {
        if (!email) {
            throw new AppError_1.default('Email is required for OTP', 400);
        }
        try {
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const key = this._createKey(email, purpose);
            await redis_1.default.setEx(key, this._otpExpirationSeconds, otp);
            logger_1.default.info(`OTP generated for ${email} (${purpose})`);
            return otp;
        }
        catch (error) {
            logger_1.default.error('Error storing OTP in Redis:', error);
            throw new AppError_1.default('Failed to generate OTP. Please try again.', 500);
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
            throw new AppError_1.default('Email and OTP code are required', 400);
        }
        if (!/^\d{6}$/.test(code)) {
            throw new AppError_1.default('Invalid OTP format', 400);
        }
        try {
            const key = this._createKey(email, purpose);
            const storedOtp = await redis_1.default.get(key);
            if (!storedOtp || storedOtp !== code) {
                logger_1.default.info(`Invalid OTP attempt for ${email} (${purpose})`);
                return false;
            }
            await redis_1.default.del(key);
            logger_1.default.info(`OTP verified successfully for ${email} (${purpose})`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error verifying OTP in Redis:', error);
            throw new AppError_1.default('OTP verification failed. Please try again.', 500);
        }
    }
    /**
     * Invalidate an existing OTP
     * @param email User's email address
     * @param purpose Purpose of the OTP
     */
    async invalidateOtp(email, purpose = 'verification') {
        if (!email) {
            throw new AppError_1.default('Email is required to invalidate OTP', 400);
        }
        try {
            const key = this._createKey(email, purpose);
            await redis_1.default.del(key);
            logger_1.default.info(`OTP invalidated for ${email} (${purpose})`);
        }
        catch (error) {
            logger_1.default.error('Error invalidating OTP in Redis:', error);
            throw new AppError_1.default('Failed to invalidate OTP. Please try again.', 500);
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
