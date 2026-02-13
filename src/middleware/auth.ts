import { Request, Response, NextFunction } from 'express'
import { container, singleton, inject } from 'tsyringe'
import { IJwtService } from '../interfaces/services'
import { IUserRepository } from '../interfaces/repositories'

@singleton()
export class AuthMiddleware {
  constructor(
    @inject("IJwtService") private _jwt: IJwtService,
    @inject("IUserRepository") private _userRepo: IUserRepository
  ) { }

  public auth = async (req: Request, res: Response, next: NextFunction) => {
    const cookieToken = (req as any).cookies?.['access_token']
    const hdr = req.headers.authorization
    const headerToken = hdr && hdr.startsWith('Bearer ') ? hdr.split(' ')[1] : undefined
    const token = cookieToken || headerToken

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const payload = this._jwt.verify(token)

      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      // Enforce DB check for ban
      const user = await this._userRepo.getById(payload.sub)

      if (!user || user.isBanned) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      req.user = {
        sub: payload.sub as string,
        username: user.username,
        isAdmin: user.isAdmin,
        ...payload
      }
      next()
    } catch (e) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
  }

  public roleGuard = (role: 'admin') => (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }
}
