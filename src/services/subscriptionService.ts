import { singleton, inject } from 'tsyringe'
import { ISubscriptionService } from '../interfaces/services'
import { ISubscriptionRepository, IWalletRepository, IUserRepository } from '../interfaces/repositories'
import { SubscriptionPlan, SubscriptionLog, User, TransactionType } from '../types'

/**
 * Determines the subscription action (new, renew, upgrade, downgrade)
 * and calculates the new expiry date and proration credit.
 * Shared logic used by both user subscribe and admin grantSubscription.
 */
export function computeSubscriptionAction(
    user: User,
    plan: SubscriptionPlan,
    oldPlan: SubscriptionPlan | null
): { action: string, newExpiry: Date, proratedCredit: number } {
    const now = new Date()
    // eslint-disable-next-line prefer-const
    let expiry = new Date(now)
    let action = 'Subscribed'
    let proratedCredit = 0

    if (user.isPremium && user.currentPlanId) {
        if (user.currentPlanId.toString() === (plan._id || plan.id || '').toString()) {
            // Same plan
            if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
                // Active → extend from current expiry
                expiry = new Date(user.subscriptionExpiry)
                action = 'Renewed'
            } else {
                action = 'Subscribed' // expired → fresh start
            }
        } else {
            // Different plan
            if (oldPlan) {
                if (oldPlan.price > plan.price) {
                    action = 'Downgraded'
                } else {
                    action = 'Upgraded'
                }

                // Proration: calculate remaining value of old plan (Gap 14)
                if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
                    const totalDuration = oldPlan.period === 'yearly'
                        ? 365 * 24 * 60 * 60 * 1000
                        : 30 * 24 * 60 * 60 * 1000
                    const remaining = new Date(user.subscriptionExpiry).getTime() - now.getTime()
                    const fractionRemaining = remaining / totalDuration
                    proratedCredit = Math.round(oldPlan.price * fractionRemaining * 100) / 100
                }
            } else {
                action = 'Subscribed'
            }
        }
    }

    // Calculate new expiry
    if (plan.period === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1)
    } else {
        // default to monthly
        expiry.setMonth(expiry.getMonth() + 1)
    }

    return { action, newExpiry: expiry, proratedCredit }
}

@singleton()
export class SubscriptionService implements ISubscriptionService {

    constructor(
        @inject('ISubscriptionRepository') private _subscriptions: ISubscriptionRepository,
        @inject('IWalletRepository') private _wallet: IWalletRepository,
        @inject('IUserRepository') private _users: IUserRepository
    ) { }

    async getPlans(): Promise<SubscriptionPlan[]> {
        return this._subscriptions.getPlans()
    }

    async subscribe(userId: string, planId: string): Promise<{ success: boolean, action?: string, expiry?: Date, message?: string }> {
        const user = await this._users.getById(userId)
        if (!user) return { success: false, message: 'User not found' }

        const plan = await this._subscriptions.getPlanById(planId)
        if (!plan) return { success: false, message: 'Plan not found' }

        // Fetch old plan if switching
        let oldPlan: SubscriptionPlan | null = null
        if (user.currentPlanId && user.currentPlanId.toString() !== (plan._id || plan.id || '').toString()) {
            oldPlan = await this._subscriptions.getPlanById(user.currentPlanId.toString())
        }

        // Prevent double-charging for identical plans if they have auto-renew on
        if (user.isPremium && user.currentPlanId && user.currentPlanId.toString() === (plan._id || plan.id || '').toString() && !user.cancelAtPeriodEnd) {
            const expiryStr = user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : 'unknown date';
            return { success: false, message: `You are already subscribed to this plan. It will auto-renew on ${expiryStr}.` }
        }

        const { action, newExpiry, proratedCredit } = computeSubscriptionAction(user, plan, oldPlan)

        // Calculate actual cost after proration credit (Gap 1 + Gap 14)
        const effectiveCost = Math.max(0, plan.price - proratedCredit)

        if (effectiveCost > 0) {
            // Deduct from wallet (Gap 1)
            const wallet = await this._wallet.get(userId)
            if (wallet.balance < effectiveCost) {
                return {
                    success: false,
                    message: `Insufficient wallet balance. Need ₹${effectiveCost.toFixed(2)}, have ₹${wallet.balance.toFixed(2)}. Please add funds first.`
                }
            }
            const deducted = await this._wallet.withdraw(userId, effectiveCost, `Subscription: ${plan.name} (${action})`, TransactionType.Subscription, 'Completed')
            if (!deducted) {
                return { success: false, message: 'Payment failed. Insufficient funds.' }
            }
        }

        // Update user premium status
        await this._users.update(userId, {
            isPremium: true,
            currentPlanId: (plan._id || plan.id || '').toString(),
            subscriptionExpiry: newExpiry,
            cancelAtPeriodEnd: false
        })

        // Log the subscription action
        await this._subscriptions.createLog({
            userId,
            planId: (plan._id || plan.id || '').toString(),
            action,
            amount: effectiveCost,
            expiryDate: newExpiry
        } as Partial<SubscriptionLog>)

        return { success: true, action, expiry: newExpiry }
    }

    async cancel(userId: string): Promise<{ success: boolean, message?: string }> {
        const user = await this._users.getById(userId)
        if (!user) return { success: false, message: 'User not found' }
        if (!user.isPremium) return { success: false, message: 'No active subscription' }

        // Get current plan for logging
        const planId = user.currentPlanId

        await this._users.update(userId, {
            cancelAtPeriodEnd: true
        })

        if (planId) {
            await this._subscriptions.createLog({
                userId,
                planId: planId.toString(),
                action: 'Auto-Renew Disabled',
                amount: 0
            } as Partial<SubscriptionLog>)
        }

        return { success: true, message: 'Auto-renew disabled. Access remains until period ends.' }
    }

    async resume(userId: string): Promise<{ success: boolean, message?: string }> {
        const user = await this._users.getById(userId)
        if (!user) return { success: false, message: 'User not found' }
        if (!user.isPremium) return { success: false, message: 'No active subscription' }
        if (!user.cancelAtPeriodEnd) return { success: false, message: 'Auto-renew is already enabled' }

        const planId = user.currentPlanId

        await this._users.update(userId, {
            cancelAtPeriodEnd: false
        })

        if (planId) {
            await this._subscriptions.createLog({
                userId,
                planId: planId.toString(),
                action: 'Auto-Renew Resumed',
                amount: 0
            } as Partial<SubscriptionLog>)
        }

        return { success: true, message: 'Auto-renew enabled successfully.' }
    }

    async history(userId: string, page: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ logs: SubscriptionLog[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit
        const { logs, total } = await this._subscriptions.getLogsByUser(userId, skip, limit, options)
        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    }
}
