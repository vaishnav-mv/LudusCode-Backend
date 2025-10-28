import { Document, Schema } from 'mongoose';
import { Role, GroupStatus } from '../constants';

export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  username: string;
  email: string;
  password?: string;
  role: Role;
  isVerified: boolean;

  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface IGroup extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  leader: IUser['_id'];
  status: GroupStatus;
  createdAt: Date;
}
