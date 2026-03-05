
import { singleton, inject } from 'tsyringe'
import { IChatRepository } from '../interfaces/repositories'
import { IChatService } from '../interfaces/services'
import { ResponseMessages } from '../constants'
import { mapMessage } from '../utils/mapper'
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto'

@singleton()
export class ChatService implements IChatService {
  constructor(@inject("IChatRepository") private _chatRepo: IChatRepository) { }

  async getMessages(groupId: string): Promise<ChatMessageResponseDTO[]> {
    const msgs = await this._chatRepo.getByGroup(groupId);
    return msgs.map(message => mapMessage(message)).filter((message): message is ChatMessageResponseDTO => message !== null);
  }

  async sendMessage(groupId: string, userId: string, text: string): Promise<ChatMessageResponseDTO> {
    const ts = new Date().toISOString();
    const message = await this._chatRepo.add(groupId, userId, text, ts);
    if (!message) throw new Error(ResponseMessages.FAILED_SEND);
    const dto = mapMessage(message);
    if (!dto) throw new Error('Failed to map message');
    return dto;
  }
}
