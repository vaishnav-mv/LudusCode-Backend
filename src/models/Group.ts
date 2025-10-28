import mongoose, { Schema, Model } from 'mongoose';
import { IGroup } from '../types/models';
import { GroupStatus } from '../constants';

const GroupSchema: Schema<IGroup> = new Schema({
  name: { type: String, required: true, trim: true },
  leader: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, enum: Object.values(GroupStatus), default: GroupStatus.Pending },
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for frequently queried fields
GroupSchema.index({ leader: 1 });
GroupSchema.index({ status: 1 });
GroupSchema.index({ leader: 1, status: 1 }); // Compound index for common query
GroupSchema.index({ createdAt: -1 });

const Group: Model<IGroup> = mongoose.model<IGroup>('Group', GroupSchema);

export default Group;
