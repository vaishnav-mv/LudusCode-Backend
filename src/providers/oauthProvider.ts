import { singleton } from 'tsyringe'
import { env } from '../config/env'
import fetch, { Response } from 'node-fetch'
import { GoogleTokens, GoogleUser, GithubTokens, GithubUser, GithubEmail } from '../types/auth'
import { IOAuthProvider } from '../interfaces/providers'


@singleton()
export class OAuthProvider implements IOAuthProvider {
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

    async getGoogleUser(code: string): Promise<{ email: string, name: string, picture: string, original: object }> {
        const tokenParams = new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const tokenRes = (await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        })) as unknown as Response

        if (!tokenRes.ok) {
            const text = await tokenRes.text();
            throw new Error(`Failed to fetch Google token: ${tokenRes.status} ${text}`);
        }

        const tokens = (await tokenRes.json()) as GoogleTokens;

        const infoRes = (await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        })) as unknown as Response

        if (!infoRes.ok) {
            const text = await infoRes.text();
            throw new Error(`Failed to fetch Google user info: ${infoRes.status} ${text}`);
        }

        const info = (await infoRes.json()) as GoogleUser;
        return {
            email: info.email,
            name: info.name,
            picture: info.picture,
            original: info
        };
    }

    getGithubAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: env.GITHUB_CLIENT_ID,
            redirect_uri: env.GITHUB_REDIRECT_URI,
            scope: 'read:user user:email'
        })
        return `https://github.com/login/oauth/authorize?${params.toString()}`
    }

    async getGithubUser(code: string): Promise<{ email: string, name: string, picture: string, original: object }> {
        const tokenRes = (await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ code, client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, redirect_uri: env.GITHUB_REDIRECT_URI })
        })) as unknown as Response

        const tokens = (await tokenRes.json()) as GithubTokens

        const infoRes = (await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'luduscode' }
        })) as unknown as Response
        const info = (await infoRes.json()) as GithubUser

        const emailRes = (await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'luduscode' }
        })) as unknown as Response
        const emails = (await emailRes.json()) as GithubEmail[]
        const primary = emails?.find(emailEntry => emailEntry.primary)?.email || emails?.[0]?.email || `${info.login}@users.noreply.github.com`

        return {
            email: primary,
            name: info.name || info.login,
            picture: info.avatar_url,
            original: info
        };
    }
}
