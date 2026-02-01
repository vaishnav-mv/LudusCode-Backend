import mongoose, { Schema } from 'mongoose'
const GroupSchema = new Schema({
  legacyId: { type: String },
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isPrivate: { type: Boolean, default: false },
  topics: { type: [String], default: [] },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  pendingMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blockedMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  owner: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })
export const GroupModel = mongoose.model('Group', GroupSchema)
