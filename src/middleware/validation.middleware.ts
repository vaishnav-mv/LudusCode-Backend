import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { HttpStatus } from '../constants';
import AppError from '../utils/AppError';


export const validateRequest =
  (schema: z.AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      const errorMessage = error.errors.map((e: any) => e.message).join(', ');
      next(new AppError(`Validation failed: ${errorMessage}`, HttpStatus.BAD_REQUEST));
    }
  };
