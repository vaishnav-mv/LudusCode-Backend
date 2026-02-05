import mongoose, { Schema, Document } from 'mongoose';
import { TransactionType } from '../types';

export interface ITransaction extends Document {
    walletId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    amount: number;
    type: TransactionType;
    status: 'Pending' | 'Completed' | 'Failed';
    description: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema({
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    description: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String }
}, {
    timestamps: true
});

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema);
