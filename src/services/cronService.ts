import { singleton, inject } from 'tsyringe';
import * as cron from 'node-cron';
import { IUserRepository, IWalletRepository, ISubscriptionRepository } from '../interfaces/repositories';
import { SubscriptionLog, User, TransactionType } from '../types';
import logger from '../utils/logger';

@singleton()
export class CronService {
    private _cronJob: cron.ScheduledTask | null = null;

    constructor(
        @inject('IUserRepository') private _users: IUserRepository,
        @inject('IWalletRepository') private _wallet: IWalletRepository,
        @inject('ISubscriptionRepository') private _subscriptions: ISubscriptionRepository
    ) { }

    startDailyCron() {
        // Run every day at midnight server time: '0 0 * * *'
        this._cronJob = cron.schedule('0 0 * * *', async () => {
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

        // 1. If user pending cancellation OR no plan found
        if (user.cancelAtPeriodEnd || !planId) {
            await this.terminateSubscription(userId, planId, 'Expired (Cancellation Pending)');
            return;
        }

        // 2. Fetch the plan details to get price
        const plan = await this._subscriptions.getPlanById(planId);
        if (!plan) {
            await this.terminateSubscription(userId, planId, 'Expired (Plan Not Found)');
            return;
        }

        // 3. Auto-Renew Logic
        const wallet = await this._wallet.get(userId);
        if (wallet.balance < plan.price) {
            await this.terminateSubscription(userId, planId, 'Expired (Insufficient Balance)');
            return;
        }

        try {
            // Deduct funds
            const success = await this._wallet.withdraw(userId, plan.price, `Auto-Renew Subscription: ${plan.name}`, TransactionType.Subscription, 'Completed');
            if (!success) {
                await this.terminateSubscription(userId, planId, 'Expired (Payment Failed)');
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
                subscriptionExpiry: newExpiry
            });

            // Log the renewal
            await this._subscriptions.createLog({
                userId,
                planId: planId.toString(),
                action: 'Auto-Renewed',
                amount: plan.price,
                expiryDate: newExpiry
            } as Partial<SubscriptionLog>);

            logger.info(`[CronService] Successfully auto-renewed user ${userId} for plan ${planId}`);
        } catch (error) {
            logger.error(`[CronService] Failed to auto-renew user ${userId}:`, error);
            // Don't terminate here, let it retry tomorrow or attempt a secondary payment hook if implemented
        }
    }

    private async terminateSubscription(userId: string, planId: string | null, reason: string) {
        await this._users.update(userId, {
            isPremium: false,
            currentPlanId: undefined,
            subscriptionExpiry: undefined,
            cancelAtPeriodEnd: false
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
