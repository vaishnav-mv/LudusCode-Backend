import { injectable, inject } from 'tsyringe';
import { IUser } from '../types/models';
import { IAuthService } from '../interfaces/services/IAuthService';
import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import { IOtpService } from '../interfaces/services/IOtpService';
import { IEmailService } from '../interfaces/services/IEmailService';
import { IJwtService } from '../interfaces/services/IJwtService';
import { HttpStatus } from '../constants';
import AppError from '../utils/AppError';
import logger from '../utils/logger';

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('IOtpService') private otpService: IOtpService,
    @inject('IEmailService') private emailService: IEmailService,
    @inject('IJwtService') private jwtService: IJwtService
  ) {}

  /**
   * Registers a new user and sends a verification OTP
   * @param userData - User registration data
   * @returns Promise with success message
   */
  async registerUser(
    userData: Pick<IUser, 'username' | 'email' | 'password'>
  ): Promise<{ message: string }> {
    const { username, email, password } = userData;

    // Input validation
    if (!username || !email || !password) {
      throw new AppError('Please provide all required fields', HttpStatus.BAD_REQUEST);
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', HttpStatus.CONFLICT);
    }

    const existingUsername = await this.userRepository.findOne({ username });
    if (existingUsername) {
      throw new AppError('Username is already taken', HttpStatus.CONFLICT);
    }

    // Generate and send OTP
    const otp = await this.otpService.generateOtp(email, 'verification');
    
    try {
      await this.emailService.sendOtpEmail(email, otp, 'verification');
    } catch (error) {
      await this.otpService.invalidateOtp(email, 'verification');
      logger.error(`Failed to send verification email to ${email}:`, error);
      throw new AppError(
        'Failed to send verification email. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Create user after successful email sending
    await this.userRepository.create({ username, email, password });
    logger.info(`User registered and verification email sent to ${email}`);

    return { message: 'Registration successful. Please check your email for an OTP.' };
  }

  /**
   * Verifies user's OTP and activates the account
   * @param email - User's email
   * @param otp - One-time password
   * @returns User data and authentication tokens
   */
  async verifyUserOTP(
    email: string, 
    otp: string
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: Pick<IUser, '_id' | 'email' | 'username' | 'role' | 'isVerified'| 'createdAt'>;
  }> {
    if (!email || !otp) {
      throw new AppError('Please provide email and OTP', HttpStatus.BAD_REQUEST);
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(email, otp, 'verification');
    if (!isValid) {
      throw new AppError('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    // Get and verify user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    // Update verification status
    user.isVerified = true;
    await user.save();

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken(
      user._id.toString(), 
      user.role
    );
    const refreshToken = this.jwtService.generateRefreshToken(
      user._id.toString(), 
      user.role
    );

    return {
      message: 'Account verified successfully',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      }
    };
  }

  /**
   * Authenticates a user and generates tokens
   * @param email - User's email
   * @param password - User's password
   * @returns User data and authentication tokens
   */
  async loginUser(
    email: string, 
    password: string
  ): Promise<{
    user: Omit<IUser, 'password'>;
    accessToken: string;
    refreshToken: string;
  }> {
    if (!email || !password) {
      throw new AppError('Please provide email and password', HttpStatus.BAD_REQUEST);
    }

    // Find user with password
    const user = await this.userRepository.findByEmail(email, '+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (!user.isVerified) {
      throw new AppError('Please verify your email first', HttpStatus.FORBIDDEN);
    }

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken(
      user._id.toString(), 
      user.role
    );
    const refreshToken = this.jwtService.generateRefreshToken(
      user._id.toString(), 
      user.role
    );

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user.toObject();

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refreshes an access token using a refresh token
   * @param refreshToken - Refresh token
   * @returns New access token and user data
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{
    accessToken: string;
    user: Pick<IUser, '_id' | 'email' | 'username' | 'role'>;
  }> {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(payload.id);
      
      if (!user) {
        throw new AppError('User not found', HttpStatus.NOT_FOUND);
      }

      const newAccessToken = this.jwtService.generateAccessToken(
        user._id.toString(), 
        user.role
      );

      return {
        accessToken: newAccessToken,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      throw new AppError('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Initiates password reset process
   * @param email - User's email
   * @returns Success message
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new AppError('Please provide an email address', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return { 
        message: 'If an account exists with this email, a password reset OTP has been sent' 
      };
    }

    const otp = await this.otpService.generateOtp(email, 'password-reset');
    
    try {
      await this.emailService.sendOtpEmail(email, otp, 'password-reset');
      return { 
        message: 'Password reset OTP sent to your email' 
      };
    } catch (error) {
      await this.otpService.invalidateOtp(email, 'password-reset');
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new AppError(
        'Failed to send password reset email. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Resets user's password using OTP
   * @param email - User's email
   * @param otp - One-time password
   * @param newPassword - New password
   * @returns Success message
   */
  async resetPassword(
    email: string, 
    otp: string, 
    newPassword: string
  ): Promise<{ message: string }> {
    if (!email || !otp || !newPassword) {
      throw new AppError(
        'Please provide email, OTP, and new password', 
        HttpStatus.BAD_REQUEST
      );
    }

    const isValid = await this.otpService.verifyOtp(email, otp, 'password-reset');
    if (!isValid) {
      throw new AppError('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    // Update password (hashing is handled by the pre-save hook)
    user.password = newPassword;
    await user.save();

    // Invalidate the used OTP
    await this.otpService.invalidateOtp(email, 'password-reset');

    return { message: 'Password reset successful' };
  }
}