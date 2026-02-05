import { singleton, inject } from 'tsyringe'
import crypto from 'crypto'
import { IWalletRepository } from '../interfaces/repositories'
import { IWalletService } from '../interfaces/services'
import { env } from '../config/env'

@singleton()
export class WalletService implements IWalletService {
    private _razorpay: any

    constructor(@inject("IWalletRepository") private _wallets: IWalletRepository) {
        // Initialize Razorpay with env vars (or defaults for safety)
        const Razorpay = require('razorpay');
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
            return order;
        } catch (error) {
            console.error("Razorpay Error:", error);
            throw new Error("Failed to create payment order");
        }
    }

    async verifyDeposit(userId: string, orderId: string, paymentId: string, signature: string) {
        const secret = env.RAZORPAY_KEY_SECRET || 'secret';
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(orderId + "|" + paymentId)
            .digest('hex');

        if (generated_signature === signature) {
            // Signature valid, proceed to deposit
            // Fetch order details simply to log or double check amount if needed?
            // For now, assume amount is correct from previous flow or fetch from Razorpay API if strictly needed.
            // But we don't have amount here. Ideally we should create a pending transaction on createOrder
            // and update it here.

            // For simplicity/MVP as per plan: just fetch the payment details to get AMOUNT
            const payment = await this._razorpay.payments.fetch(paymentId);
            const amountInRupees = (payment.amount as number) / 100;

            await this._wallets.deposit(userId, amountInRupees, `Deposit via Razorpay (Tx: ${paymentId})`);
            return true;
        }
        return false;
    }

    // Manual/Admin deposit (internal use)
    async deposit(userId: string, amount: number) {
        await this._wallets.deposit(userId, amount, `Deposit of ₹${amount.toFixed(2)}`);
    }

    // Updated: Real Payout Flow using Razorpay X
    async withdraw(userId: string, amount: number, vpa: string, name: string = "User", email: string = "user@example.com", phone: string = "9999999999") {
        // 1. Check Balance locally first
        const wallet = await this._wallets.get(userId);
        if (!wallet || wallet.balance < amount) return false;

        try {
            // 2. Create Contact
            // In a real app, you'd save contact_id to the user model to avoid re-creating.
            const contact = await this._razorpay.contacts.create({
                name: name,
                email: email,
                contact: phone,
                type: "customer",
                reference_id: userId,
                notes: { userId }
            });

            // 3. Create Fund Account (UPI)
            const fundAccount = await this._razorpay.fundAccount.create({
                contact_id: contact.id,
                account_type: "vpa",
                vpa: {
                    address: vpa
                }
            });

            // 4. Create Payout
            const payout = await this._razorpay.payouts.create({
                account_number: "2323230075591741", // Test Mode Account Number provided by Razorpay docs
                fund_account_id: fundAccount.id,
                amount: amount * 100, // paise
                currency: "INR",
                mode: "UPI",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: `withdraw_${Date.now()}`,
                narration: "Ludus Withdrawal"
            });

            // 5. Deduct Balance immediately (Escrow style)
            // We assume payout will succeed or be pending. If it fails *sync*, we throw.
            // If it fails *async* (webhook), we would refund.
            await this._wallets.withdraw(userId, amount, `Withdrawal (Px: ${payout.id})`);

            return true;
        } catch (error) {
            console.error("Razorpay Payout Error:", error);
            // If payout creation failed, we haven't deducted balance yet, so safe to return false.
            return false;
        }
    }

    async wager(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, -amount, description);
    }

    async win(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, amount, description);
    }
}
