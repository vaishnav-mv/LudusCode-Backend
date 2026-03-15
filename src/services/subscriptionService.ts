import { singleton, inject } from 'tsyringe'
import { ISubscriptionService } from '../interfaces/services'
import { ISubscriptionRepository, IWalletRepository, IUserRepository } from '../interfaces/repositories'
import { SubscriptionPlan, SubscriptionLog, TransactionType, SubscriptionAction } from '../types'
import { mapSubscriptionPlan, mapSubscriptionLog } from '../utils/mapper'
import { SubscriptionPlanResponseDTO, SubscriptionLogResponseDTO } from '../dto/response/subscription.response.dto'
import { computeSubscriptionAction } from '../utils/subscriptionHelper';


@singleton()
export class SubscriptionService implements ISubscriptionService {

    constructor(
        @inject('ISubscriptionRepository') private _subscriptions: ISubscriptionRepository,
        @inject('IWalletRepository') private _wallet: IWalletRepository,
        @inject('IUserRepository') private _users: IUserRepository
    ) { }

    async getPlans(): Promise<SubscriptionPlanResponseDTO[]> {
        const plans = await this._subscriptions.getPlans();
        return plans.map(plan => mapSubscriptionPlan(plan)).filter((plan): plan is SubscriptionPlanResponseDTO => plan !== null);
    }

    async subscribe(userId: string, planId: string): Promise<{ success: boolean, action?: string, expiry?: Date, message?: string }> {
        const user = await this._users.getById(userId)
        if (!user) return { success: false, message: 'User not found' }

        const plan = await this._subscriptions.getPlanById(planId)
        if (!plan) return { success: false, message: 'Plan not found' }

        const oldPlanIdStr = user.currentPlanId ? user.currentPlanId.toString() : null;
        const newPlanIdStr = (plan._id || plan.id || '').toString();

        // Fetch old plan if switching
        let oldPlan: SubscriptionPlan | null = null
        if (oldPlanIdStr && oldPlanIdStr !== newPlanIdStr) {
            oldPlan = await this._subscriptions.getPlanById(oldPlanIdStr)
        }

        // Prevent double-charging for identical plans if they have auto-renew on
        if (user.isPremium && oldPlanIdStr === newPlanIdStr && !user.cancelAtPeriodEnd) {
            const expiryStr = user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : 'unknown date';
            return { success: false, message: `You are already subscribed to this plan. It will auto-renew on ${expiryStr}.` }
        }

        const { action, newExpiry, proratedCredit } = computeSubscriptionAction(user, plan, oldPlan)

        // Queue Downgrade Logic
        if (action === 'Downgraded' && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()) {
            await this._users.update(userId, {
                pendingPlanId: newPlanIdStr,
                cancelAtPeriodEnd: false // Ensure it auto-renews into the new plan
            });
            await this._subscriptions.createLog({
                userId,
                planId: newPlanIdStr,
                action: SubscriptionAction.DowngradeScheduled,
                amount: 0,
                expiryDate: user.subscriptionExpiry
            } as Partial<SubscriptionLog>);
            
            return { 
                success: true, 
                action: SubscriptionAction.DowngradeScheduled, 
                message: `Your plan will downgrade to ${plan.name} at the end of your current billing cycle.` 
            };
        }

        // Calculate actual cost after proration credit
        const effectiveCost = Math.max(0, plan.price - proratedCredit)

        if (effectiveCost > 0) {
            // Deduct from wallet
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
            currentPlanId: newPlanIdStr,
            subscriptionExpiry: newExpiry,
            cancelAtPeriodEnd: false,
            pendingPlanId: null, // Clear any pending plans if they forcefully switch/upgrade
            failedRenewalPlanId: null // Clear any failed states
        })

        // Log the subscription action
        await this._subscriptions.createLog({
            userId,
            planId: newPlanIdStr,
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
            cancelAtPeriodEnd: true,
            pendingPlanId: null // Clear any pending downgrades when cancelling fully
        })

        if (planId) {
            await this._subscriptions.createLog({
                userId,
                planId: planId.toString(),
                action: SubscriptionAction.AutoRenewDisabled,
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
                action: SubscriptionAction.AutoRenewResumed,
                amount: 0
            } as Partial<SubscriptionLog>)
        }

        return { success: true, message: 'Auto-renew enabled successfully.' }
    }

    async history(userId: string, page: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ logs: SubscriptionLogResponseDTO[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit
        const { logs, total } = await this._subscriptions.getLogsByUser(userId, skip, limit, options)
        return {
            logs: logs.map(log => mapSubscriptionLog(log)).filter((log): log is SubscriptionLogResponseDTO => log !== null),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    }
}
