import { singleton, inject } from 'tsyringe'
import { IWalletRepository } from '../interfaces/repositories'
import { IWalletService } from '../interfaces/services'
import { IPaymentProvider } from '../interfaces/providers'
import { mapWallet, mapTransaction } from '../utils/mapper'
import { WalletResponseDTO } from '../dto/response/wallet.response.dto'
import { TransactionResponseDTO } from '../dto/response/transaction.response.dto'
import logger from '../utils/logger'

@singleton()
export class WalletService implements IWalletService {
    constructor(
        @inject("IWalletRepository") private _wallets: IWalletRepository,
        @inject("IPaymentProvider") private _paymentProvider: IPaymentProvider
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
            return true;
        }
        return false;
    }



    async withdraw(userId: string, amount: number, vpa: string, _name?: string, _email?: string, _phone?: string) {
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
