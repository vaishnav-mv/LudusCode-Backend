import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { container } from 'tsyringe';
import config from '../config';
import { HttpStatus } from '../constants';
import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import AppError from '../utils/AppError';
import logger from '../utils/logger';

/**
 * Middleware to protect routes by verifying the JWT.
 * It decodes the token, finds the user, and attaches them to the request object.
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  try {
    // Prefer the access token cookie issued by AuthController, fall back to legacy name if present
    token = req.cookies?.access_token || req.cookies?.auth_token;

    if (!token) {
      throw new AppError('Not authorized, no token', HttpStatus.UNAUTHORIZED);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };

    const userRepository = container.resolve<IUserRepository>('IUserRepository');
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return next(new AppError('Not authorized, user not found', HttpStatus.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch (error) {
    // Enhanced error logging with context
    const errorContext = {
      token: token ? token.substring(0, 10) + '...' : 'none',
      ip: req.ip,
      path: req.path,
      method: req.method,
    };

    // Distinguish between expired and invalid tokens
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired:', errorContext);
      next(new AppError('Session expired. Please login again.', HttpStatus.UNAUTHORIZED));
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token:', errorContext);
      next(new AppError('Invalid authentication token.', HttpStatus.UNAUTHORIZED));
    } else {
      logger.error('Authentication error:', { ...errorContext, error });
      next(new AppError('Authentication failed. Please try again.', HttpStatus.UNAUTHORIZED));
    }
  }
};
