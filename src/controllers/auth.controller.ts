import { Request, Response, NextFunction } from 'express';
import container from '../di';
import { IAuthService } from '../interfaces/services/IAuthService';
import { ApiResponse } from '../utils/responseHelper';
import { DTOMapper } from '../utils/dtoMapper';
import { HttpStatus } from '../constants';
import AppError from '../utils/AppError';
import logger from '../utils/logger';
import { IUser } from '../types/models';

/**
 * Controller responsible for handling every authentication HTTP request.
 * Uses dependency injection to remain decoupled from the service layer.
 */
export class AuthController {
  private readonly _authService: IAuthService;

  constructor() {
    this._authService = container.resolve<IAuthService>('IAuthService');
  }

  /**
   * Persist the issued JWTs in HTTP-only cookies to shield them from XSS.
   */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
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
  private clearAuthCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const options = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', options);
  }

  /**
   * Handles user registration requests.
   * @param req - Express Request containing the new user's credentials in the body.
   * @param res - Express Response used to return the success message.
   * @param next - Express NextFunction used to delegate error handling.
   * @returns Promise<void>
   */
  public registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('Registration attempt started.');
      const result = await this._authService.registerUser(req.body);
      ApiResponse.success(
        res,
        result,
        'Registration successful. Please verify your email.',
        HttpStatus.CREATED
      );
    } catch (error) {
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
  public verifyUserOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp } = req.body;
      const {  message,accessToken, refreshToken, user } = await this._authService.verifyUserOTP(email, otp);

      this.setAuthCookies(res, accessToken, refreshToken);

      const userDTO = DTOMapper.toUserResponseDTO(user as unknown as IUser);
      ApiResponse.success(res, { user: userDTO }, message ?? 'OTP verification successful', HttpStatus.OK);
    } catch (error) {
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
  public loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await this._authService.loginUser(email, password);

      this.setAuthCookies(res, accessToken, refreshToken);

      const userDTO = DTOMapper.toUserResponseDTO(user as unknown as IUser);
      ApiResponse.success(res, { user: userDTO }, 'Login successful', HttpStatus.OK);
    } catch (error) {
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
  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        throw new AppError('Refresh token missing', HttpStatus.UNAUTHORIZED);
      }

      const { accessToken, user } = await this._authService.refreshToken(refreshToken);

      this.setAuthCookies(res, accessToken, refreshToken);

      const userDTO = DTOMapper.toUserResponseDTO(user as unknown as IUser);
      ApiResponse.success(res, { user: userDTO }, 'Token refreshed successfully', HttpStatus.OK);
    } catch (error) {
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
  public getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', HttpStatus.UNAUTHORIZED);
      }

      const userDTO = DTOMapper.toUserResponseDTO(req.user);
      ApiResponse.success(res, userDTO, 'Profile fetched successfully', HttpStatus.OK);
    } catch (error) {
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
  public logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.clearAuthCookies(res);
      ApiResponse.success(res, null, 'Logged out successfully', HttpStatus.OK);
    } catch (error) {
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
  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this._authService.forgotPassword(email);
      ApiResponse.success(
        res,
        result,
        'If the account exists, a reset OTP has been sent.',
        HttpStatus.OK
      );
    } catch (error) {
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
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await this._authService.resetPassword(email, otp, newPassword);
      ApiResponse.success(res, result, 'Password reset successful', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
