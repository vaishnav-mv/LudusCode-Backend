import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { injectable } from 'tsyringe';
import { IJwtService, ITokenPayload } from '../interfaces/services/IJwtService';
import config from '../config';

@injectable()
export class JwtService implements IJwtService {
  private readonly accessTokenOptions: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };

  private readonly refreshTokenOptions: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };

  generateAccessToken(userId: string, role?: string): string {
    const payload: Omit<ITokenPayload, 'iat' | 'exp'> = { id: userId };
    if (role) payload.role = role;

    return jwt.sign(payload, config.jwt.secret as Secret, this.accessTokenOptions);
  }

  generateRefreshToken(userId: string, role?: string): string {
    const payload: Omit<ITokenPayload, 'iat' | 'exp'> = { id: userId };
    if (role) payload.role = role;

    return jwt.sign(payload, config.jwt.refreshSecret as Secret, this.refreshTokenOptions);
  }

  verifyAccessToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret as Secret) as ITokenPayload;
    } catch {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret as Secret) as ITokenPayload;
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }
}
