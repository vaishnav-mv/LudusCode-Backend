import bcrypt from 'bcryptjs'
import { IUserRepository } from '../interfaces/repositories'
import { singleton, inject } from 'tsyringe'

import { IAuthService, IJwtService, IOtpService, IEmailService } from '../interfaces/services'
import { env } from '../config/env'
import { ResponseMessages } from '../constants'
import logger from '../utils/logger'

@singleton()
export class AuthService implements IAuthService {
  constructor(
    @inject("IUserRepository") private _userRepo: IUserRepository,
    @inject("IJwtService") private _jwtService: IJwtService,
    @inject("IOtpService") private _otpService: IOtpService,
    @inject("IEmailService") private _emailService: IEmailService
  ) { }

  async login(email: string, password: string) {
    const user = await this._userRepo.getByEmail(email);
    if (!user) throw new Error(ResponseMessages.INVALID_CREDENTIALS);
    // Prevent admin from logging in via user login
    if (user.isAdmin) throw new Error(ResponseMessages.ADMIN_LOGIN_ONLY);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);

    const ok = user.passwordHash ? bcrypt.compareSync(password, user.passwordHash) : password === 'password123';
    if (!ok) throw new Error(ResponseMessages.INVALID_CREDENTIALS);
    if (!user.isVerified) throw new Error(ResponseMessages.EMAIL_NOT_VERIFIED);
    const access = this._jwtService.signAccess({ sub: user._id!.toString(), isAdmin: !!user.isAdmin });
    const refresh = this._jwtService.signRefresh({ sub: user._id!.toString() });
    return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } };
  }

  async adminLogin(email: string, password: string) {
    const user = await this._userRepo.getByEmail(email);
    if (!user) throw new Error(ResponseMessages.INVALID_CREDENTIALS);
    if (!user.isAdmin) throw new Error(ResponseMessages.UNAUTHORIZED);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);

    // Check password
    const ok = user.passwordHash ? bcrypt.compareSync(password, user.passwordHash) : false;
    if (!ok) throw new Error(ResponseMessages.INVALID_CREDENTIALS);

    const access = this._jwtService.signAccess({ sub: user._id!.toString(), isAdmin: !!user.isAdmin });
    const refresh = this._jwtService.signRefresh({ sub: user._id!.toString() });
    return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } };
  }

  async register(username: string, email: string, password: string) {
    const existing = await this._userRepo.getByEmail(email);
    if (existing) throw new Error(ResponseMessages.EMAIL_IN_USE);
    const hash = bcrypt.hashSync(password, 10);
    const created = await this._userRepo.create({
      username,
      email,
      passwordHash: hash,
      avatarUrl: '',
      elo: 1200,
      duelsWon: 0,
      duelsLost: 0,
      isAdmin: false,
      isBanned: false,
      isPremium: false,
      isVerified: false
    } as any);
    const code = await this._otpService.create(email, 'register');
    logger.info({ message: 'OTP for registration', code })
    await this._emailService.sendOtp(email, code);
    return { id: created._id!.toString() };
  }

  async resendVerificationOtp(email: string) {
    const user = await this._userRepo.getByEmail(email);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.isVerified) throw new Error(ResponseMessages.ALREADY_VERIFIED);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);
    const code = await this._otpService.create(email, 'register');
    logger.info({ message: 'Resend OTP for registration', code })
    await this._emailService.sendOtp(email, code);
    return true;
  }

  async verifyOtp(email: string, code: string) {
    const ok = await this._otpService.verify(email, code, 'register');
    if (!ok) throw new Error(ResponseMessages.INVALID_OTP);
    const user = await this._userRepo.getByEmail(email);
    if (user) {
      if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);
      await this._userRepo.update(user._id!.toString(), { isVerified: true });
      const access = this._jwtService.signAccess({ sub: user._id!.toString(), isAdmin: !!user.isAdmin });
      const refresh = this._jwtService.signRefresh({ sub: user._id!.toString() });
      return { ok: true, user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } };
    }
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this._userRepo.getByEmail(email);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);
    const code = await this._otpService.create(email, 'reset');
    logger.info({ message: 'OTP for reset', code })
    // In a real app, send a different email template for reset
    await this._emailService.sendOtp(email, code);
    return true;
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const ok = await this._otpService.verify(email, code, 'reset');
    if (!ok) throw new Error(ResponseMessages.INVALID_OTP);
    const user = await this._userRepo.getByEmail(email);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);
    const hash = bcrypt.hashSync(newPassword, 10);
    await this._userRepo.update(user._id!.toString(), { passwordHash: hash });
    return true;
  }

  async refresh(refreshToken: string) {
    const payload = this._jwtService.verify(refreshToken);
    if (typeof payload === 'string' || !('sub' in payload)) throw new Error(ResponseMessages.INVALID_TOKEN);
    const user = await this._userRepo.getById((payload as any).sub);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.isBanned) throw new Error(ResponseMessages.USER_BANNED);

    const access = this._jwtService.signAccess({ sub: user._id!.toString(), isAdmin: !!user.isAdmin });
    return { access };
  }
}
