
import mongoose, { Schema } from 'mongoose';

const SubscriptionPlanSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    period: { type: String, enum: ['monthly', 'yearly'], required: true },
    maxDailyDuels: { type: Number, default: 5 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const SubscriptionPlanModel = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
