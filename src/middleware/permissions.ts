import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'

@singleton()
export class PermissionsMiddleware {
  constructor() { }

  public requirePremium = (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user
    if (!u || !u.isPremium) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}
