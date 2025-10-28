import { SignOptions } from 'jsonwebtoken';

export interface ITokenPayload {
  id: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface IJwtService {
  generateAccessToken(userId: string, role?: string): string;
  generateRefreshToken(userId: string, role?: string): string;
  verifyAccessToken(token: string): ITokenPayload;
  verifyRefreshToken(token: string): ITokenPayload;
}