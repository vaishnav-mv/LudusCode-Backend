import { Request, Response, NextFunction } from 'express'

export class PermissionsMiddleware {
  private static instance: PermissionsMiddleware;

  private constructor() { }

  public static getInstance(): PermissionsMiddleware {
    if (!PermissionsMiddleware.instance) {
      PermissionsMiddleware.instance = new PermissionsMiddleware();
    }
    return PermissionsMiddleware.instance;
  }

  public requirePremium = (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user
    if (!u || !u.isPremium) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}
