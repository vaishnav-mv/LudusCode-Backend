
import mongoose, { Schema } from 'mongoose';

const SubscriptionPlanSchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    period: { type: String, enum: ['monthly', 'yearly'], required: true },
    features: { type: [String], default: [] }
}, { timestamps: true });

export const SubscriptionPlanModel = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
