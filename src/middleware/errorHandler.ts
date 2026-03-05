import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { getErrorMessage } from '../utils/errorUtils'
import logger from '../utils/logger'

@singleton()
export class ErrorMiddleware {
  constructor() { }

  public handle = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ message: 'Unhandled API Error', error: err, path: req.path })

    // Fallback default
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = getErrorMessage(err);

    // Some specific messages map exactly to 401/403/400/404 throughout the controllers
    if (message === ResponseMessages.USER_BANNED || message.includes('Forbidden') || message.includes('block')) {
      status = HttpStatus.FORBIDDEN;
    } else if (message === ResponseMessages.UNAUTHORIZED || message.includes('Invalid credentials') || message.includes('Invalid token') || message.includes('Only the owner')) {
      status = HttpStatus.UNAUTHORIZED;
    } else if (message.includes('not found') || message.includes('Not Found')) {
      status = HttpStatus.NOT_FOUND;
    } else if (
      message.includes('Validation Error') ||
      message.includes('already taken') ||
      message.includes('Cannot') ||
      message.includes('in use') ||
      message.includes('Invalid OTP') ||
      message.includes('already started') ||
      message.includes('already ended') ||
      message.includes('Not a participant')
    ) {
      status = HttpStatus.BAD_REQUEST;
    }

    // Explicit overrides
    const errorWithStatus = err as { status?: number, statusCode?: number }
    if (errorWithStatus.status || errorWithStatus.statusCode) {
      status = errorWithStatus.status || errorWithStatus.statusCode || status;
    }

    return ApiResponse.error(res, message, status);
  }
}
