import { Request, Response, NextFunction } from 'express';
import { Role, HttpStatus } from '../constants';
import AppError from '../utils/AppError';


export const admin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === Role.Admin) {
    next();
  } else {
    next(new AppError('Not authorized as an admin', HttpStatus.FORBIDDEN));
  }
};
