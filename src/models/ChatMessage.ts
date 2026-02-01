import mongoose, { Schema } from 'mongoose'
const ChatMessageSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true }
}, { timestamps: true })
export const ChatMessageModel = mongoose.model('ChatMessage', ChatMessageSchema)

