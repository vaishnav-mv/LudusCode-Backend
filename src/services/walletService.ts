import { singleton, inject } from 'tsyringe'
import { IWalletRepository, IUserRepository } from '../interfaces/repositories'
import { IWalletService, ISubscriptionService } from '../interfaces/services'
import { IPaymentProvider } from '../interfaces/providers'
import { mapWallet, mapTransaction } from '../utils/mapper'
import { WalletResponseDTO } from '../dto/response/wallet.response.dto'
import { TransactionResponseDTO } from '../dto/response/transaction.response.dto'
import logger from '../utils/logger'

@singleton()
export class WalletService implements IWalletService {
    constructor(
        @inject("IWalletRepository") private _wallets: IWalletRepository,
        @inject("IPaymentProvider") private _paymentProvider: IPaymentProvider,
        @inject("IUserRepository") private _users: IUserRepository,
        @inject("ISubscriptionService") private _subscriptionService: ISubscriptionService
    ) { }


    async get(userId: string): Promise<WalletResponseDTO | null> {
        const wallet = await this._wallets.get(userId);
        return wallet ? mapWallet(wallet) : null;
    }

    async createDepositOrder(userId: string, amount: number) {
        const receipt = `receipt_${Date.now()}_${userId.substring(0, 5)}`;
        return this._paymentProvider.createOrder(amount, "INR", receipt);
    }

    async verifyDeposit(userId: string, orderId: string, paymentId: string, signature: string) {
        if (this._paymentProvider.verifySignature(orderId, paymentId, signature)) {

            const payment = await this._paymentProvider.fetchPayment(paymentId) as { amount: number };
            const amountInRupees = payment.amount / 100;

            await this._wallets.deposit(userId, amountInRupees, `Deposit via Razorpay (Tx: ${paymentId})`);
            
            // Hook: Check if user missed an auto-renewal and retry
            try {
                const user = await this._users.getById(userId);
                if (user && user.failedRenewalPlanId && !user.isPremium) {
                    const planIdStr = typeof user.failedRenewalPlanId === 'object' && 'toString' in user.failedRenewalPlanId 
                        ? user.failedRenewalPlanId.toString() 
                        : user.failedRenewalPlanId as string;
                    
                    logger.info(`[WalletService] Triggering missed auto-renewal for user ${userId}`);
                    await this._subscriptionService.subscribe(userId, planIdStr);
                    // Subscription service handles clearing the failed state upon success
                }
            } catch (err) {
                logger.error('[WalletService] Failed to process auto-renewal hook after deposit', err);
            }

            return true;
        }
        return false;
    }



    async withdraw(userId: string, amount: number, vpa: string) {
        try {

            const deducted = await this._wallets.withdraw(userId, amount, `Withdrawal to ${vpa}`);

            if (!deducted) {
                throw new Error("Insufficient funds or database error during withdrawal.");
            }


            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Withdrawal failed';
            logger.error('Withdrawal Error:', msg);
            throw new Error(msg);
        }
    }

    async wager(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, -amount, description);
    }

    async win(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, amount, description);
    }

    async getTransactions(userId: string, page: number, limit: number, type?: string, startDate?: string, endDate?: string): Promise<{ transactions: TransactionResponseDTO[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const { transactions, total } = await this._wallets.getTransactions(userId, skip, limit, type, startDate, endDate);
        return {
            transactions: transactions.map(transaction => mapTransaction(transaction)).filter((transaction): transaction is TransactionResponseDTO => transaction !== null),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
}
