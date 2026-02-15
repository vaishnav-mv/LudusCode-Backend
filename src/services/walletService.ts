import { singleton, inject } from 'tsyringe'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { IWalletRepository } from '../interfaces/repositories'
import { IWalletService } from '../interfaces/services'
import { env } from '../config/env'
import { RazorpayOrder } from '../types'

@singleton()
export class WalletService implements IWalletService {
    private _razorpay: Razorpay

    constructor(@inject("IWalletRepository") private _wallets: IWalletRepository) {
        // Initialize Razorpay with env vars (or defaults for safety)
        this._razorpay = new Razorpay({
            key_id: env.RAZORPAY_KEY_ID || 'rzp_test_123',
            key_secret: env.RAZORPAY_KEY_SECRET || 'secret'
        })
    }


    async get(userId: string) {
        return this._wallets.get(userId);
    }

    async createDepositOrder(userId: string, amount: number) {
        const options = {
            amount: amount * 100, // amount in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}_${userId.substring(0, 5)}`
        };
        try {
            const order = await this._razorpay.orders.create(options);
            return order as unknown as RazorpayOrder;
        } catch (error: unknown) {
            console.error("Razorpay Error:", error);
            throw new Error("Failed to create payment order");
        }
    }

    async verifyDeposit(userId: string, orderId: string, paymentId: string, signature: string) {
        const secret = env.RAZORPAY_KEY_SECRET || 'secret';
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generatedSignature === signature) {
            // Signature valid, proceed to deposit
            // For simplicity/MVP as per plan: just fetch the payment details to get AMOUNT
            const payment = await this._razorpay.payments.fetch(paymentId);
            const amountInRupees = (payment.amount as number) / 100;

            await this._wallets.deposit(userId, amountInRupees, `Deposit via Razorpay (Tx: ${paymentId})`);
            return true;
        }
        return false;
    }

    async deposit(userId: string, amount: number) {
        await this._wallets.deposit(userId, amount, `Deposit of ₹${amount.toFixed(2)}`);
    }

    // Updated: Simulated Withdrawal (since Razorpay Test Mode doesn't support real Payouts)
    async withdraw(userId: string, amount: number, vpa: string, _name?: string, _email?: string, _phone?: string) {
        // 1. Check Balance locally first
        const wallet = await this._wallets.get(userId);
        if (!wallet || wallet.balance < amount) return false;

        try {
            // 2. Direct DB Deduction (Simulation)
            console.log(`[WalletService] Simulating withdrawal for ${userId}, amount: ${amount}, VPA: ${vpa}`);
            const deducted = await this._wallets.withdraw(userId, amount, `Withdrawal to ${vpa}`);

            if (!deducted) {
                throw new Error("Insufficient funds or database error during withdrawal.");
            }

            console.log(`[WalletService] Withdrawal successful.`);
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Withdrawal failed';
            console.error("Withdrawal Error:", msg);
            throw new Error(msg);
        }
    }

    async wager(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, -amount, description);
    }

    async win(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, amount, description);
    }
}
