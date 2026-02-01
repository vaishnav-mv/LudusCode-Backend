import { Request, Response, NextFunction } from 'express'

export class AdminMiddleware {
  private static instance: AdminMiddleware;

  private constructor() { }

  public static getInstance(): AdminMiddleware {
    if (!AdminMiddleware.instance) {
      AdminMiddleware.instance = new AdminMiddleware();
    }
    return AdminMiddleware.instance;
  }

  public requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user
    if (!u || !u.isAdmin) return res.status(403).json({ message: 'Forbidden' })
    next()
  }

  public requirePremium = (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user
    if (!u || !u.isPremium) return res.status(403).json({ message: 'Forbidden' })
    next()
  }
}
