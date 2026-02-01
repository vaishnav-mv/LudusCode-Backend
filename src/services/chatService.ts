
import { singleton, inject } from 'tsyringe'
import { IChatRepository } from '../interfaces/repositories'
import { IChatService } from '../interfaces/services'
import { mapMessage } from '../utils/mapper'
import { ResponseMessages } from '../constants'

@singleton()
export class ChatService implements IChatService {
  constructor(@inject("IChatRepository") private _chatRepo: IChatRepository) { }

  async getMessages(groupId: string) {
    const msgs = await this._chatRepo.getByGroup(groupId);
    return msgs.map(mapMessage);
  }

  async sendMessage(groupId: string, userId: string, text: string) {
    const ts = new Date().toISOString();
    const message = await this._chatRepo.add(groupId, userId, text, ts);
    if (!message) throw new Error(ResponseMessages.FAILED_SEND);
    return mapMessage(message);
  }
}
