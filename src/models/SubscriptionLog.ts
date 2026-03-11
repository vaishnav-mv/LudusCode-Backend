
import mongoose, { Schema } from 'mongoose';
import { SubscriptionAction } from '../types';

const SubscriptionLogSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    action: { type: String, enum: Object.values(SubscriptionAction), required: true },
    amount: { type: Number, default: 0 },
    expiryDate: { type: Date },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const SubscriptionLogModel = mongoose.model('SubscriptionLog', SubscriptionLogSchema);
