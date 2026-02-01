import { singleton, inject } from 'tsyringe'
import { SubscriptionPlanModel } from '../models/SubscriptionPlan'
import { SubscriptionLogModel } from '../models/SubscriptionLog'
import { IUserRepository } from '../interfaces/repositories'

@singleton()
export class SubscriptionService {
    constructor(
        @inject("IUserRepository") private _users: IUserRepository
    ) { }

    async getPlans() {
        const plans = await SubscriptionPlanModel.find().lean();
        return plans.map((p: any) => ({ ...p, id: p._id.toString() }));
    }

    async subscribe(userId: string, planId: string) {
        const user = await this._users.getById(userId)
        const plan = await SubscriptionPlanModel.findById(planId)

        if (!user || !plan) return { success: false, message: 'Invalid user or plan' }

        const now = new Date();
        let expiry = new Date(now);
        let action = 'Subscribed';

        // Check current state logic - Replicated/Shared with AdminService
        if (user.isPremium && user.currentPlanId) {
            if (user.currentPlanId.toString() === plan._id.toString()) {
                // Same Plan
                if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
                    // Active -> Extend (Renew)
                    expiry = new Date(user.subscriptionExpiry);
                    action = 'Renewed';
                } else {
                    // Expired -> New Start (Resubscribe)
                    action = 'Subscribed';
                }
            } else {
                // Different Plan -> Check for Upgrade vs Downgrade
                const oldPlan = await SubscriptionPlanModel.findById(user.currentPlanId);
                if (oldPlan && oldPlan.price > plan.price) {
                    action = 'Downgraded';
                } else {
                    action = 'Upgraded';
                }
            }
        } else {
            // New Subscription
            action = 'Subscribed';
        }

        // specific check: if action is 'Subscribed' based on logic but user had no previous plan, it matches 'Subscribed'

        // Calculate Duration to add
        if (plan.period === 'monthly') {
            expiry.setMonth(expiry.getMonth() + 1);
        } else if (plan.period === 'yearly') {
            expiry.setFullYear(expiry.getFullYear() + 1);
        } else {
            expiry.setMonth(expiry.getMonth() + 1);
        }

        await this._users.update(userId, {
            isPremium: true,
            currentPlanId: plan._id.toString(),
            subscriptionExpiry: expiry
        })

        await SubscriptionLogModel.create({
            userId,
            planId,
            action: action,
            amount: plan.price,
            expiryDate: expiry
        })

        return { success: true, action, expiry }
    }
}
