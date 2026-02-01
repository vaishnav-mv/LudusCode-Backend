import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { env } from '../config/env'
import logger from '../utils/logger'
import { HttpStatus, ResponseMessages } from '../constants'
import { IAuthService, IJwtService, ISocialAuthService } from '../interfaces/services'
import { IUserRepository } from '../interfaces/repositories'
import {
  LoginRequestDTO, RegisterRequestDTO, VerifyOtpRequestDTO,
  ResendOtpRequestDTO, ForgotPasswordRequestDTO, ResetPasswordRequestDTO
} from '../dto/request/auth.request.dto'

@singleton()
export class AuthController {
  constructor(
    @inject("IAuthService") private _service: IAuthService,
    @inject("ISocialAuthService") private _socialService: ISocialAuthService,
    @inject("IUserRepository") private _userRepo: IUserRepository,
    @inject("IJwtService") private _jwtService: IJwtService
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
      res.json({ user: loginResult.user })
    } catch (e: any) {
      this.handleError(res, e)
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
      res.json({ user: loginResult.user })
    } catch (e: any) {
      this.handleError(res, e)
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
      res.json(registrationResult)
    } catch (e: any) {
      logger.error({ message: 'Registration error', error: e })
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message })
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
        res.json({ ok: true, user: otpResult.user })
      } else {
        res.json({ ok: true })
      }
    } catch (e: any) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message })
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
      res.json({ ok: true })
    } catch (e: any) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message })
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
      res.json({ ok: true })
    } catch (e: any) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message })
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
      res.json({ ok: true })
    } catch (e: any) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message })
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
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
      }
      const refreshResult = await this._service.refresh(tokenString)
      res.cookie('access_token', refreshResult.access, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        domain: env.COOKIE_DOMAIN,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      })
      res.json({ ok: true })
    } catch (e: any) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
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
    res.json({ ok: true })
  }

  /**
   * @desc    Get current user profile
   * @route   GET /api/auth/me
   * @req     header: Authorization
   * @res     { user }
   */
  me = async (req: Request, res: Response) => {
    try {
      const currentAuth = (req as any).user
      if (!currentAuth?.sub) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
      }
      const user = await this._userRepo.getById(currentAuth.sub as string)
      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
      }
      if ((user as any).isBanned) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: ResponseMessages.USER_BANNED })
      }
      res.json({ user })
    } catch {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
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
        return res.status(HttpStatus.BAD_REQUEST).json({ message: ResponseMessages.MISSING_CODE })
      }

      const result = await this._socialService.handleGoogleCallback(code);

      res.cookie('access_token', result.tokens.access, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 15 * 60 * 1000 })
      res.cookie('refresh_token', result.tokens.refresh, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.redirect(env.FRONTEND_URL)
    } catch (e: any) {
      logger.error({ message: 'Google OAuth error', error: e })
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: ResponseMessages.OAUTH_ERROR,
        details: e.message,
        stack: e.stack
      })
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
        return res.status(HttpStatus.BAD_REQUEST).json({ message: ResponseMessages.MISSING_CODE })
      }

      const result = await this._socialService.handleGithubCallback(code);

      res.cookie('access_token', result.tokens.access, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 15 * 60 * 1000 })
      res.cookie('refresh_token', result.tokens.refresh, { httpOnly: true, secure: env.COOKIE_SECURE, domain: env.COOKIE_DOMAIN, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
      res.redirect(env.FRONTEND_URL)
    } catch (e: any) {
      logger.error({ message: 'GitHub OAuth error', error: e })
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ResponseMessages.OAUTH_ERROR })
    }
  }

  private setCookies(res: Response, result: any) {
    if (result.tokens) {
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

  private handleError(res: Response, e: any) {
    logger.error({ message: 'Auth error', error: e })
    if (e.message === ResponseMessages.USER_BANNED) {
      res.status(HttpStatus.FORBIDDEN).json({ message: e.message })
    } else {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: e.message })
    }
  }
}
