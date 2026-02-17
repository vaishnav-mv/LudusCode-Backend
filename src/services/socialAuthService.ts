import { singleton, inject } from 'tsyringe'
import { ISocialAuthService } from '../interfaces/services'
import { IJwtProvider, IOAuthProvider } from '../interfaces/providers'
import { IUserRepository } from '../interfaces/repositories'
import { env } from '../config/env'
import { ResponseMessages } from '../constants'
import logger from '../utils/logger'


@singleton()
export class SocialAuthService implements ISocialAuthService {
    constructor(
        @inject("IUserRepository") private _userRepo: IUserRepository,
        @inject("IJwtProvider") private _jwtProvider: IJwtProvider,
        @inject("IOAuthProvider") private _oauthProvider: IOAuthProvider
    ) { }

    getGoogleAuthUrl(): string {
        return this._oauthProvider.getGoogleAuthUrl();
    }

    async handleGoogleCallback(code: string) {
        try {
            logger.info({ message: 'Starting Google Callback handling', codeFragment: code.substring(0, 10) + '...' });

            const info = await this._oauthProvider.getGoogleUser(code);
            const email = info.email
            const username = info.name || email.split('@')[0]

            logger.info({ message: 'Finding/Creating user', email });
            let user = await this._userRepo.getByEmail(email)
            if (!user) {
                logger.info('Creating new user...');
                user = await this._userRepo.create({
                    username,
                    email,
                    avatarUrl: info.picture || '',
                    elo: 1200,
                    duelsWon: 0,
                    duelsLost: 0,
                    isAdmin: false,
                    isBanned: false,
                    isPremium: false,
                    isVerified: true
                })
            } else {
                logger.info({ message: 'User found', userId: user.id });
            }

            if (user.isBanned) {
                throw new Error(ResponseMessages.USER_BANNED)
            }

            const access = this._jwtProvider.signAccess({ sub: user._id?.toString() || user.id || '', isAdmin: !!user.isAdmin })
            const refresh = this._jwtProvider.signRefresh({ sub: user._id?.toString() || user.id || '' })

            logger.info('Google Auth success');
            return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } }
        } catch (e: unknown) {
            logger.error({ message: 'Error in handleGoogleCallback', error: e });
            throw e;
        }
    }

    getGithubAuthUrl(): string {
        return this._oauthProvider.getGithubAuthUrl();
    }

    async handleGithubCallback(code: string) {
        const info = await this._oauthProvider.getGithubUser(code);
        const username = info.name || info.email.split('@')[0]

        let user = await this._userRepo.getByEmail(info.email)
        if (!user) {
            user = await this._userRepo.create({
                username,
                email: info.email,
                avatarUrl: info.picture || '',
                elo: 1200,
                duelsWon: 0,
                duelsLost: 0,
                isAdmin: false,
                isBanned: false,
                isPremium: false,
                isVerified: true
            })
        }

        if (user.isBanned) {
            throw new Error(ResponseMessages.USER_BANNED)
        }

        const access = this._jwtProvider.signAccess({ sub: user._id?.toString() || user.id || '', isAdmin: !!user.isAdmin })
        const refresh = this._jwtProvider.signRefresh({ sub: user._id?.toString() || user.id || '' })

        return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } }
    }
}
