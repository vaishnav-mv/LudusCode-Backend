import jwt from 'jsonwebtoken'
import { singleton } from 'tsyringe'
import { env } from '../config/env'
import { IJwtService } from '../interfaces/services'

@singleton()
export class JwtService implements IJwtService {
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

  verify(token: string): jwt.JwtPayload | string {
    return jwt.verify(token, env.JWT_SECRET as jwt.Secret)
  }
}
