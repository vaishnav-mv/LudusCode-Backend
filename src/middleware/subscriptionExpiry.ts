import { Request, Response, NextFunction } from 'express'
import { container } from 'tsyringe'
import { IUserRepository } from '../interfaces/repositories'
import logger from '../utils/logger'

/**
 * Middleware that checks if the authenticated user's subscription has expired.
 * If expired, auto-revokes isPremium status in the database and on req.user.
 * Attach this AFTER AuthMiddleware in the middleware chain.
 */
export const subscriptionExpiryMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user || !user.isPremium || !user.subscriptionExpiry) {
            return next()
        }

        const expiry = new Date(user.subscriptionExpiry)
        const now = new Date()

        if (expiry <= now) {
            // Subscription has expired — auto-revoke premium status
            const userRepo = container.resolve<IUserRepository>('IUserRepository')
            await userRepo.update(user._id!, {
                isPremium: false,
                currentPlanId: undefined,
                subscriptionExpiry: undefined
            })

            // Update req.user for the rest of the request
            req.user!.isPremium = false
            req.user!.currentPlanId = undefined
            req.user!.subscriptionExpiry = undefined
        }

        next()
    } catch (err) {
        // Don't block the request if expiry check fails
        logger.error('Subscription expiry check error:', err)
        next()
    }
}
