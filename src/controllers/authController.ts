import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { env } from '../config/env'
import logger from '../utils/logger'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IAuthService, ISocialAuthService } from '../interfaces/services'
import {
  LoginRequestDTO, RegisterRequestDTO, VerifyOtpRequestDTO,
  ResendOtpRequestDTO, ForgotPasswordRequestDTO, ResetPasswordRequestDTO
} from '../dto/request/auth.request.dto'
import { getErrorMessage } from '../utils/errorUtils'

@singleton()
export class AuthController {
  constructor(
    @inject("IAuthService") private _service: IAuthService,
    @inject("ISocialAuthService") private _socialService: ISocialAuthService
  ) { }

  /**
   * @desc    Authenticate user and issue tokens
   * @route   POST /api/auth/login
   * @req     body: { email, password }
   * @res     { user, cookies: { access_token, refresh_token } }
   */
  login = async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginRequestDTO
    try {
      const loginResult = await this._service.login(email, password)
      this.setCookies(res, loginResult)
      return ApiResponse.success(res, { user: loginResult.user }, 'Login successful')
    } catch (e: unknown) {
      return this.handleError(res, e)
    }
  }

  /**
   * @desc    Authenticate admin user
   * @route   POST /api/auth/admin-login
   * @req     body: { email, password }
   * @res     { user, cookies: { access_token, refresh_token } }
   */
  adminLogin = async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginRequestDTO
    try {
      const loginResult = await this._service.adminLogin(email, password)
      this.setCookies(res, loginResult)
      return ApiResponse.success(res, { user: loginResult.user }, 'Admin login successful')
    } catch (e: unknown) {
      return this.handleError(res, e)
    }
  }

  /**
   * @desc    Register a new user
   * @route   POST /api/auth/register
   * @req     body: { username, email, password }
   * @res     { id }
   */
  register = async (req: Request, res: Response) => {
    const { username, email, password } = req.body as RegisterRequestDTO
    try {
      const registrationResult = await this._service.register(username, email, password)
      return ApiResponse.success(res, registrationResult, 'Registration successful', HttpStatus.CREATED)
    } catch (e: unknown) {
      logger.error({ message: 'Registration error', error: e })
      return ApiResponse.error(res, getErrorMessage(e), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Verify OTP for email verification
   * @route   POST /api/auth/verify-otp
   * @req     body: { email, code }
   * @res     { ok: true, user? }
   */
  verifyOtp = async (req: Request, res: Response) => {
    const { email, code } = req.body as VerifyOtpRequestDTO
    try {
      const otpResult = await this._service.verifyOtp(email, code)
      if (otpResult.tokens) {
        this.setCookies(res, otpResult)
        return ApiResponse.success(res, { user: otpResult.user }, 'OTP Verified')
      } else {
        return ApiResponse.success(res, null, 'OTP Verified')
      }
    } catch (error: unknown) {
      return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Resend verification OTP
   * @route   POST /api/auth/resend-verification-otp
   * @req     body: { email }
   * @res     { ok: true }
   */
  resendVerificationOtp = async (req: Request, res: Response) => {
    const { email } = req.body as ResendOtpRequestDTO
    try {
      await this._service.resendVerificationOtp(email)
      return ApiResponse.success(res, null, 'OTP Resent')
    } catch (error: unknown) {
      return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Initiate password reset flow
   * @route   POST /api/auth/forgot-password
   * @req     body: { email }
   * @res     { ok: true }
   */
  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body as ForgotPasswordRequestDTO
    try {
      await this._service.forgotPassword(email)
      return ApiResponse.success(res, null, 'Password reset OTP sent')
    } catch (error: unknown) {
      return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Reset password with OTP
   * @route   POST /api/auth/reset-password
   * @req     body: { email, code, newPassword }
   * @res     { ok: true }
   */
  resetPassword = async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body as ResetPasswordRequestDTO
    try {
      await this._service.resetPassword(email, code, newPassword)
      return ApiResponse.success(res, null, 'Password reset successful')
    } catch (error: unknown) {
      return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Refresh access token
   * @route   POST /api/auth/refresh
   * @req     cookie: refresh_token
   * @res     { ok: true, matches cookie }
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const tokenString = req.cookies['refresh_token']
      if (!tokenString) {
        return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
      }
      const refreshResult = await this._service.refresh(tokenString)
      res.cookie('access_token', refreshResult.access, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        domain: env.COOKIE_DOMAIN,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      })
      return ApiResponse.success(res, null, 'Token refreshed')
    } catch {
      return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    }
  }

  /**
   * @desc    Logout user
   * @route   POST /api/auth/logout
   * @req     -
   * @res     { ok: true }
   */
  logout = async (req: Request, res: Response) => {
    res.clearCookie('access_token', { domain: env.COOKIE_DOMAIN })
    res.clearCookie('refresh_token', { domain: env.COOKIE_DOMAIN })
    return ApiResponse.success(res, null, 'Logged out')
  }

  /**
   * @desc    Get current user profile
   * @route   GET /api/auth/me
   * @req     header: Authorization
   * @res     { user }
   */
  me = async (req: Request, res: Response) => {
    try {
      const currentAuth = req.user
      if (!currentAuth?.sub) {
        return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
      }
      const user = await this._service.getMe(currentAuth.sub as string)
      return ApiResponse.success(res, { user })
    } catch (error: unknown) {
      // getMe throws if user not found or banned, map to appropriate response
      const msg = getErrorMessage(error);
      if (msg === ResponseMessages.USER_BANNED) {
        return ApiResponse.error(res, msg, HttpStatus.FORBIDDEN)
      }
      return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    }
  }

  /**
   * @desc    Initiate Google OAuth
   * @route   GET /api/auth/google/start
   * @req     -
   * @res     Redirect to Google
   */
  googleStart = async (req: Request, res: Response) => {
    const url = this._socialService.getGoogleAuthUrl();
    res.redirect(url);
  }

  /**
   * @desc    Handle Google OAuth Callback
   * @route   GET /api/auth/google/callback
   * @req     query: { code }
   * @res     Redirect to Frontend with cookies
   */
  googleCallback = async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string
      if (!code) {
        return ApiResponse.error(res, ResponseMessages.MISSING_CODE, HttpStatus.BAD_REQUEST)
      }

      const result = await this._socialService.handleGoogleCallback(code);

      res.cookie('access_token', result.tokens.access, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 15 * 60 * 1000 })
      res.cookie('refresh_token', result.tokens.refresh, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.redirect(env.FRONTEND_URL)
    } catch (error: unknown) {
      logger.error({ message: 'Google OAuth error', error: error })
      return ApiResponse.error(res, ResponseMessages.OAUTH_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, { details: getErrorMessage(error) })
    }
  }

  /**
   * @desc    Initiate GitHub OAuth
   * @route   GET /api/auth/github/start
   * @req     -
   * @res     Redirect to GitHub
   */
  githubStart = async (req: Request, res: Response) => {
    const url = this._socialService.getGithubAuthUrl();
    res.redirect(url);
  }

  /**
   * @desc    Handle GitHub OAuth Callback
   * @route   GET /api/auth/github/callback
   * @req     query: { code }
   * @res     Redirect to Frontend with cookies
   */
  githubCallback = async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string
      if (!code) {
        return ApiResponse.error(res, ResponseMessages.MISSING_CODE, HttpStatus.BAD_REQUEST)
      }

      const result = await this._socialService.handleGithubCallback(code);

      res.cookie('access_token', result.tokens.access, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 15 * 60 * 1000 })
      res.cookie('refresh_token', result.tokens.refresh, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.redirect(env.FRONTEND_URL)
    } catch (e: unknown) {
      logger.error({ message: 'GitHub OAuth error', error: e })
      return ApiResponse.error(res, ResponseMessages.OAUTH_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  private setCookies(res: Response, result: { tokens?: { access: string, refresh: string }, cookie?: { secure: boolean, domain: string } }) {
    if (result.tokens && result.cookie) {
      res.cookie('access_token', result.tokens.access, {
        httpOnly: true,
        secure: result.cookie.secure,
        domain: result.cookie.domain,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      })
      res.cookie('refresh_token', result.tokens.refresh, {
        httpOnly: true,
        secure: result.cookie.secure,
        domain: result.cookie.domain,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
    }
  }

  private handleError(res: Response, e: unknown) {
    logger.error({ message: 'Auth error', error: e })
    const msg = getErrorMessage(e)
    if (msg === ResponseMessages.USER_BANNED) {
      return ApiResponse.error(res, msg, HttpStatus.FORBIDDEN)
    } else {
      return ApiResponse.error(res, msg, HttpStatus.UNAUTHORIZED)
    }
  }
}
