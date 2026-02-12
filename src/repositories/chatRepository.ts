import { singleton } from 'tsyringe'
import { ChatMessageModel } from '../models/ChatMessage'
import { IChatRepository } from '../interfaces/repositories'
import { ChatMessage } from '../types'
import { BaseRepository } from './BaseRepository'
import { Model } from 'mongoose'

@singleton()
export class ChatRepository extends BaseRepository<ChatMessage> implements IChatRepository {
  constructor() {
    super(ChatMessageModel as any)
  }
  async getByGroup(groupId: string) {
    const messages = await this.model.find({ groupId })
      .populate('user')
      .sort({ timestamp: 1 })
      .lean()

    return messages.map(msg => this.mapDoc(msg)!)
  }

  async add(groupId: string, userId: string, text: string, timestamp: string) {
    const message = await this.model.create({
      groupId,
      user: userId,
      text,
      timestamp
    })

    const populated = await this.model.findById(message._id)
      .populate('user')
      .lean()

    return this.mapDoc(populated)!
  }
}
