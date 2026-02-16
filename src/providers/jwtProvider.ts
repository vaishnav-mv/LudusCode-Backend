import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { JwtPayload } from '../types'
import { singleton } from 'tsyringe'
import { IJwtProvider } from '../interfaces/providers'

@singleton()
export class JwtProvider implements IJwtProvider {
    signAccess(payload: object): string {
        return jwt.sign(
            payload,
            env.JWT_SECRET as jwt.Secret,
            { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions
        )
    }

    signRefresh(payload: object): string {
        return jwt.sign(
            payload,
            env.JWT_SECRET as jwt.Secret,
            { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
        )
    }

    verify(token: string): JwtPayload | string {
        return jwt.verify(token, env.JWT_SECRET as jwt.Secret)
    }
}
