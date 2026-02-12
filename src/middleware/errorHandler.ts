import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'

@singleton()
export class ErrorMiddleware {
  constructor() { }

  public handle = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    const error = err as { status?: number, message?: string }
    const status = error.status || 500
    const message = error.message || 'Internal error'
    res.status(status).json({ message })
  }
}
