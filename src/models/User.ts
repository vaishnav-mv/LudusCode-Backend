import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

import { IUser } from '../types/models';
import { Role } from '../constants';

const UserSchema: Schema<IUser> = new Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  avatarUrl: { type: String, default: '' },
  rank: { type: String, default: 'Beginner' },
  elo: { type: Number, default: 1200 },
  duelsWon: { type: Number, default: 0 },
  duelsLost: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(Role), default: Role.User },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for frequently queried fields
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
