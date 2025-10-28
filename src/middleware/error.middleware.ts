import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';
import { HttpStatus } from '../constants';
import { ApiResponse } from '../utils/responseHelper';
import logger from '../utils/logger';


export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error for debugging purposes
  logger.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });

  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode);
  } else {
    // For unexpected errors, send a generic message
    ApiResponse.error(res, 'An internal server error occurred', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
