import { User, SubscriptionPlan, SubscriptionAction } from '../types';

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
    const now = new Date();
    let expiry = new Date(now);
    let action = SubscriptionAction.Subscribed as string;
    let proratedCredit = 0

    if (user.isPremium && user.currentPlanId) {
        if (user.currentPlanId.toString() === (plan._id || plan.id || '').toString()) {
            // Same plan
            if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
                // Active → extend from current expiry
                expiry = new Date(user.subscriptionExpiry)
                action = SubscriptionAction.Renewed;
            } else {
                action = SubscriptionAction.Subscribed; // expired → fresh start
            }
        } else {
            // Different plan
            if (oldPlan) {
                if (oldPlan.price > plan.price) {
                    action = SubscriptionAction.Downgraded;
                } else {
                    action = SubscriptionAction.Upgraded;
                }

                // Proration: calculate remaining value of old plan
                if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
                    const totalDuration = oldPlan.period === 'yearly'
                        ? 365 * 24 * 60 * 60 * 1000
                        : 30 * 24 * 60 * 60 * 1000
                    const remaining = new Date(user.subscriptionExpiry).getTime() - now.getTime()
                    const fractionRemaining = remaining / totalDuration
                    proratedCredit = Math.round(oldPlan.price * fractionRemaining * 100) / 100
                }
            } else {
                action = SubscriptionAction.Subscribed;
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
