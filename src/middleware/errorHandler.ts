import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'

@singleton()
export class ErrorMiddleware {
  constructor() { }

  public handle = (err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500
    res.status(status).json({ message: err.message || 'Internal error' })
  }
}
