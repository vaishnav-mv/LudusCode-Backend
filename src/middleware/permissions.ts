import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'

@singleton()
export class PermissionsMiddleware {
  constructor() { }

  public requirePremium = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || !user.isPremium) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}
