import { singleton } from 'tsyringe'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env'
import { RazorpayOrder } from '../types'
import { IPaymentProvider } from '../interfaces/providers'

@singleton()
export class PaymentProvider implements IPaymentProvider {
    private _razorpay: Razorpay

    constructor() {
        this._razorpay = new Razorpay({
            key_id: env.RAZORPAY_KEY_ID || 'rzp_test_123',
            key_secret: env.RAZORPAY_KEY_SECRET || 'secret'
        })
    }

    async createOrder(amount: number, currency: string, receipt: string): Promise<RazorpayOrder> {
        const options = {
            amount: amount * 100, // amount in paisa
            currency,
            receipt
        };
        try {
            const order = await this._razorpay.orders.create(options);
            return order as unknown as RazorpayOrder;
        } catch (error: unknown) {
            console.error("Razorpay Error:", error);
            throw new Error("Failed to create payment order");
        }
    }

    verifySignature(orderId: string, paymentId: string, signature: string): boolean {
        const secret = env.RAZORPAY_KEY_SECRET || 'secret';
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(orderId + "|" + paymentId)
            .digest('hex');

        return generatedSignature === signature;
    }

    async fetchPayment(paymentId: string): Promise<object> {
        return this._razorpay.payments.fetch(paymentId);
    }
}
