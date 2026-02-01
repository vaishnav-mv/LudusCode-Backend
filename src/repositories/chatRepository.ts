import { singleton } from 'tsyringe'
import { ChatMessageModel } from '../models/ChatMessage'
import { IChatRepository } from '../interfaces/repositories'

@singleton()
export class ChatRepository implements IChatRepository {
  async getByGroup(groupId: string) {
    return ChatMessageModel.find({ groupId })
      .populate('user')
      .sort({ timestamp: 1 })
      .lean()
  }

  async add(groupId: string, userId: string, text: string, timestamp: string) {
    const message = await ChatMessageModel.create({
      groupId,
      user: userId,
      text,
      timestamp
    })

    return ChatMessageModel.findById(message._id)
      .populate('user')
      .lean()
  }
}
