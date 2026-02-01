
import { singleton, inject } from 'tsyringe'
import { ISocialAuthService, IJwtService } from '../interfaces/services'
import { IUserRepository } from '../interfaces/repositories'
import { env } from '../config/env'
import { ResponseMessages } from '../constants'
import logger from '../utils/logger'

@singleton()
export class SocialAuthService implements ISocialAuthService {
    constructor(
        @inject("IUserRepository") private _userRepo: IUserRepository,
        @inject("IJwtService") private _jwtService: IJwtService
    ) { }

    getGoogleAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: env.GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent'
        })
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    async handleGoogleCallback(code: string) {
        try {
            logger.info({ message: 'Starting Google Callback handling', codeFragment: code.substring(0, 10) + '...' });
            const fetch = (await import('node-fetch')).default;
            logger.info('Fetching token from Google...');

            const tokenParams = new URLSearchParams({
                code,
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                redirect_uri: env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code'
            });
            logger.debug({ message: 'Token Params prepared', params: tokenParams.toString().replace(env.GOOGLE_CLIENT_SECRET, '***') });

            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams
            })

            const tokensText = await tokenRes.text();
            logger.info({ message: 'Token response received', status: tokenRes.status, body: tokensText });

            if (!tokenRes.ok) {
                throw new Error(`Failed to fetch token: ${tokenRes.status} ${tokensText}`);
            }

            const tokens = JSON.parse(tokensText);

            logger.info('Fetching user info...');
            const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            })

            const infoText = await infoRes.text();
            logger.info({ message: 'User Info response received', status: infoRes.status, body: infoText });

            if (!infoRes.ok) {
                throw new Error(`Failed to fetch user info: ${infoRes.status} ${infoText}`);
            }

            const info = JSON.parse(infoText);
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
                } as any)
            } else {
                logger.info({ message: 'User found', userId: user.id });
            }

            if ((user as any).isBanned) {
                throw new Error(ResponseMessages.USER_BANNED)
            }

            const access = this._jwtService.signAccess({ sub: (user as any)._id?.toString?.() || (user as any).id, isAdmin: !!(user as any).isAdmin })
            const refresh = this._jwtService.signRefresh({ sub: (user as any)._id?.toString?.() || (user as any).id })

            logger.info('Google Auth success');
            return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } }
        } catch (e: any) {
            logger.error({ message: 'Error in handleGoogleCallback', error: e });
            throw e;
        }
    }

    getGithubAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: env.GITHUB_CLIENT_ID,
            redirect_uri: env.GITHUB_REDIRECT_URI,
            scope: 'read:user user:email'
        })
        return `https://github.com/login/oauth/authorize?${params.toString()}`
    }

    async handleGithubCallback(code: string) {
        const fetch = (await import('node-fetch')).default;
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ code, client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, redirect_uri: env.GITHUB_REDIRECT_URI })
        })
        const tokens = (await tokenRes.json()) as any
        const infoRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'luduscode' }
        })
        const info = (await infoRes.json()) as any
        const emailRes = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'luduscode' }
        })
        const emails = (await emailRes.json()) as any[]
        const primary = emails?.find(emailEntry => emailEntry.primary)?.email || emails?.[0]?.email || `${info.login}@users.noreply.github.com`
        const username = info.name || info.login

        let user = await this._userRepo.getByEmail(primary)
        if (!user) {
            user = await this._userRepo.create({
                username,
                email: primary,
                avatarUrl: info.avatar_url || '',
                elo: 1200,
                duelsWon: 0,
                duelsLost: 0,
                isAdmin: false,
                isBanned: false,
                isPremium: false,
                isVerified: true
            } as any)
        }

        if ((user as any).isBanned) {
            throw new Error(ResponseMessages.USER_BANNED)
        }

        const access = this._jwtService.signAccess({ sub: (user as any)._id?.toString?.() || (user as any).id, isAdmin: !!(user as any).isAdmin })
        const refresh = this._jwtService.signRefresh({ sub: (user as any)._id?.toString?.() || (user as any).id })

        return { user, tokens: { access, refresh }, cookie: { domain: env.COOKIE_DOMAIN, secure: env.COOKIE_SECURE } }
    }
}
