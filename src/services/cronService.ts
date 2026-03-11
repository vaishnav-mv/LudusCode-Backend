import { singleton, inject } from 'tsyringe';
import * as cron from 'node-cron';
import { IUserRepository, IWalletRepository, ISubscriptionRepository } from '../interfaces/repositories';
import { SubscriptionLog, User, TransactionType, SubscriptionAction } from '../types';
import logger from '../utils/logger';
import { env } from '../config/env';

@singleton()
export class CronService {
    private _cronJob: cron.ScheduledTask | null = null;

    constructor(
        @inject('IUserRepository') private _users: IUserRepository,
        @inject('IWalletRepository') private _wallet: IWalletRepository,
        @inject('ISubscriptionRepository') private _subscriptions: ISubscriptionRepository
    ) { }

    startDailyCron() {
        // Run every day at midnight server time by default
        this._cronJob = cron.schedule(env.CRON_SCHEDULE, async () => {
            logger.info(`[CronService] Running daily subscription check at ${new Date().toISOString()}`);
            await this.processExpiredSubscriptions();
        });

        logger.info('[CronService] Daily subscription cron initialized.');
    }

    async processExpiredSubscriptions() {
        try {
            const now = new Date();
            const expiredUsers = await this._users.findExpiredPremiumUsers(now);

            for (const user of expiredUsers) {
                await this.processUserSubscription(user);
            }
        } catch (error) {
            logger.error('[CronService] Error processing expired subscriptions:', error);
        }
    }

    private async processUserSubscription(user: User) {
        if (!user.id && !user._id) return;
        const userId = (user.id || user._id)!.toString();
        const planId = user.currentPlanId ? user.currentPlanId.toString() : null;

        if (user.cancelAtPeriodEnd || !planId) {
            await this.terminateSubscription(userId, planId, SubscriptionAction.Expired);
            return;
        }

        // 2. Fetch the plan details to get price (check for pending downgrade first)
        const targetPlanId = user.pendingPlanId ? user.pendingPlanId.toString() : planId;
        const plan = await this._subscriptions.getPlanById(targetPlanId);
        if (!plan) {
            await this.terminateSubscription(userId, planId, SubscriptionAction.Expired);
            return;
        }

        // 3. Auto-Renew Logic
        const wallet = await this._wallet.get(userId);
        if (wallet.balance < plan.price) {
            await this.terminateSubscription(userId, planId, SubscriptionAction.Expired, planId);
            return;
        }

        try {
            // Deduct funds
            const success = await this._wallet.withdraw(userId, plan.price, `Auto-Renew Subscription: ${plan.name}`, TransactionType.Subscription, 'Completed');
            if (!success) {
                await this.terminateSubscription(userId, planId, SubscriptionAction.Expired);
                return;
            }

            // Calculate new expiry (from the old expiry, not necessarily now, to maintain cycle if running late)
            // But if they are extremely overdue, just base it off the old expiry + 1 period.
            const oldExpiry = new Date(user.subscriptionExpiry as string | Date);
            const newExpiry = new Date(oldExpiry);

            if (plan.period === 'yearly') {
                newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            } else {
                newExpiry.setMonth(newExpiry.getMonth() + 1);
            }

            // Update User
            await this._users.update(userId, {
                subscriptionExpiry: newExpiry,
                currentPlanId: targetPlanId,
                pendingPlanId: null, // Clear pending after successful transition
                failedRenewalPlanId: null
            });

            // Log the renewal or transition
            const actionString = user.pendingPlanId ? SubscriptionAction.Downgraded : SubscriptionAction.AutoRenewed;
            await this._subscriptions.createLog({
                userId,
                planId: targetPlanId,
                action: actionString,
                amount: plan.price,
                expiryDate: newExpiry
            } as Partial<SubscriptionLog>);

            logger.info(`[CronService] Successfully auto-renewed user ${userId} for plan ${planId}`);
        } catch (error) {
            logger.error(`[CronService] Failed to auto-renew user ${userId}:`, error);
            // Don't terminate here, let it retry tomorrow or attempt a secondary payment hook if implemented
        }
    }

    private async terminateSubscription(userId: string, planId: string | null, reason: string, failedPlanId?: string | null) {
        await this._users.update(userId, {
            isPremium: false,
            currentPlanId: undefined,
            subscriptionExpiry: undefined,
            cancelAtPeriodEnd: false,
            pendingPlanId: null,
            failedRenewalPlanId: failedPlanId || null
        });

        if (planId) {
            await this._subscriptions.createLog({
                userId,
                planId,
                action: reason,
                amount: 0
            } as Partial<SubscriptionLog>);
        }

        logger.info(`[CronService] Terminated subscription for user ${userId}. Reason: ${reason}`);
    }
}
