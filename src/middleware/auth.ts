import { Request, Response, NextFunction } from 'express'
import { singleton, inject } from 'tsyringe'
import { IUserRepository } from '../interfaces/repositories'
import { IJwtProvider } from '../interfaces/providers'

@singleton()
export class AuthMiddleware {
  constructor(
    @inject("IUserRepository") private _userRepo: IUserRepository,
    @inject("IJwtProvider") private _jwtProvider: IJwtProvider
  ) { }

  public auth = async (req: Request, res: Response, next: NextFunction) => {
    const cookieToken = req.cookies?.['access_token']
    const hdr = req.headers.authorization
    const headerToken = hdr && hdr.startsWith('Bearer ') ? hdr.split(' ')[1] : undefined
    const token = cookieToken || headerToken

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const payload = this._jwtProvider.verify(token)

      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      // Enforce DB check for ban
      const user = await this._userRepo.getById(payload.sub)

      if (!user || user.isBanned) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      req.user = {
        ...user,
        sub: payload.sub as string
      }
      next()
    } catch {
      return res.status(401).json({ message: 'Unauthorized' })
    }
  }

  public roleGuard = (_role: 'admin') => (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    next()
  }
}
