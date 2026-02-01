import mongoose, { Schema } from 'mongoose'
const UserSchema = new Schema({
  legacyId: { type: String },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  avatarUrl: { type: String },
  elo: { type: Number, default: 1200 },
  duelsWon: { type: Number, default: 0 },
  duelsLost: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  currentPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  subscriptionExpiry: { type: Date }
}, { timestamps: true })
export const UserModel = mongoose.model('User', UserSchema)
