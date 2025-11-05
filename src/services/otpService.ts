import { injectable } from 'tsyringe';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import crypto from 'crypto';
import { HttpStatus } from '../constants';
import { IOtpService } from '../interfaces/services/IOtpService';
import AppError from '../utils/AppError';

/**
 * Service for handling OTP (One-Time Password) operations using Redis
 */
@injectable()
export class OtpService implements IOtpService {
  // Default expiration time for OTPs in seconds (10 minutes)
  private readonly _otpExpirationSeconds = 600;

  // Redis key prefix for OTPs
  private readonly _keyPrefix = 'otp:';

  // Rate limiting: max 3 OTP requests per 15 minutes
  private readonly _maxOtpRequests = 3;
  private readonly _rateLimitWindowSeconds = 900; // 15 minutes

  // Brute force protection: max 5 failed attempts
  private readonly _maxVerificationAttempts = 5;
  private readonly _lockoutDurationSeconds = 1800; // 30 minutes

  /**
   * Generate a new OTP for a user
   * @param email User's email address
   * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
   * @returns The generated OTP code
   */
  async generateOtp(email: string, purpose: string = 'verification'): Promise<string> {
    if (!email) {
      throw new AppError('Email is required for OTP', HttpStatus.BAD_REQUEST);
    }
    try {
      // Check rate limiting
      const rateLimitKey = `otp:ratelimit:${email}:${purpose}`;
      const requestCount = await redisClient.get(rateLimitKey);
      
      if (requestCount && parseInt(requestCount) >= this._maxOtpRequests) {
        logger.warn(`Rate limit exceeded for ${email} (${purpose})`);
        throw new AppError('Too many OTP requests. Please try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Increment rate limit counter
      const newCount = await redisClient.incr(rateLimitKey);
      if (newCount === 1) {
        // Set expiration only on first request
        await redisClient.expire(rateLimitKey, this._rateLimitWindowSeconds);
      }

      // Generate and store OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const key = this._createKey(email, purpose);
      await redisClient.setEx(key, this._otpExpirationSeconds, otp);
      
      logger.info(`[OTP] ${purpose} OTP for ${email}: ${otp} (Requests ${newCount}/${this._maxOtpRequests})`);
      return otp;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error storing OTP in Redis:', error);
      throw new AppError('Failed to generate OTP. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify an OTP for a user
   * @param email User's email address
   * @param code OTP code to verify
   * @param purpose Purpose of the OTP
   * @returns Boolean indicating if OTP is valid
   */
  async verifyOtp(email: string, code: string, purpose: string = 'verification'): Promise<boolean> {
    if (!email || !code) {
      throw new AppError('Email and OTP code are required', HttpStatus.BAD_REQUEST);
    }
    if (!/^\d{6}$/.test(code)) {
      throw new AppError('Invalid OTP format', HttpStatus.BAD_REQUEST);
    }
    try {
      // Check if account is locked due to too many failed attempts
      const attemptsKey = `otp:attempts:${email}:${purpose}`;
      const attempts = await redisClient.get(attemptsKey);
      
      if (attempts && parseInt(attempts) >= this._maxVerificationAttempts) {
        logger.warn(`Account locked for ${email} (${purpose}) due to too many failed attempts`);
        throw new AppError('Too many failed attempts. Account locked for 30 minutes.', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Verify OTP
      const key = this._createKey(email, purpose);
      const storedOtp = await redisClient.get(key);
      
      if (!storedOtp || storedOtp !== code) {
        // Increment failed attempts counter
        const newAttempts = await redisClient.incr(attemptsKey);
        if (newAttempts === 1) {
          // Set expiration on first failed attempt
          await redisClient.expire(attemptsKey, this._lockoutDurationSeconds);
        }
        logger.info(`Invalid OTP attempt for ${email} (${purpose}). Attempts: ${newAttempts}/${this._maxVerificationAttempts}`);
        return false;
      }
      
      // Success: delete OTP and reset attempts counter
      await redisClient.del(key);
      await redisClient.del(attemptsKey);
      logger.info(`OTP verified successfully for ${email} (${purpose})`);
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error verifying OTP in Redis:', error);
      throw new AppError('OTP verification failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Invalidate an existing OTP
   * @param email User's email address
   * @param purpose Purpose of the OTP
   */
  async invalidateOtp(email: string, purpose: string = 'verification'): Promise<void> {
    if (!email) {
      throw new AppError('Email is required to invalidate OTP', HttpStatus.BAD_REQUEST);
    }
    try {
      const key = this._createKey(email, purpose);
      await redisClient.del(key);
      logger.info(`OTP invalidated for ${email} (${purpose})`);
    } catch (error) {
      logger.error('Error invalidating OTP in Redis:', error);
      throw new AppError('Failed to invalidate OTP. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Create a Redis key for storing OTP
   * @param email User's email
   * @param purpose OTP purpose
   * @returns Formatted Redis key
   */
  private _createKey(email: string, purpose: string): string {
    return `${this._keyPrefix}${email}:${purpose}`;
  }
}

export default OtpService;
