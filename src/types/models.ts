import { Document, Schema } from 'mongoose';
import { Role, GroupStatus } from '../constants';

export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  username: string;
  name: string;
  email: string;
  avatarUrl?: string;
  rank: string;
  elo: number;
  duelsWon: number;
  duelsLost: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  isPremium?: boolean;
  password?: string;
  role: Role;
  isVerified: boolean;
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface IGroup extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  description: string;
  topics: string[];
  leader: IUser['_id'];
  members: IUser['_id'][];
  status: GroupStatus;
  rejectionReason?: string;
  createdAt: Date;
}
