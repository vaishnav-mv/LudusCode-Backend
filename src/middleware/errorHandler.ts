import { Request, Response, NextFunction } from 'express'

export class ErrorMiddleware {
  private static instance: ErrorMiddleware;

  private constructor() { }

  public static getInstance(): ErrorMiddleware {
    if (!ErrorMiddleware.instance) {
      ErrorMiddleware.instance = new ErrorMiddleware();
    }
    return ErrorMiddleware.instance;
  }

  public handle = (err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500
    res.status(status).json({ message: err.message || 'Internal error' })
  }
}
