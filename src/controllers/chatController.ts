import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'

import { broadcastChat } from '../realtime/ws'
import { IChatService } from '../interfaces/services'
import { SendMessageDTO } from '../dto/request/chat.request.dto'
import { mapMessage } from '../utils/mapper'
import { ApiResponse } from '../utils/ApiResponse'
import { HttpStatus } from '../constants'

@singleton()
export class ChatController {
    constructor(@inject("IChatService") private _service: IChatService) { }

    /**
     * @desc    Get messages for a group
     * @route   GET /api/chat/:groupId/messages
     * @req     params: { groupId }
     * @res     [Message]
     */
    getMessages = async (req: Request, res: Response) => {
        const groupId = req.params.groupId;
        const messages = await this._service.getMessages(groupId);
        return ApiResponse.success(res, messages.map(mapMessage).filter(Boolean))
    }

    /**
     * @desc    Send a message to a group
     * @route   POST /api/chat/:groupId/messages
     * @req     params: { groupId }, body: { userId, text }
     * @res     { message }
     */
    sendMessage = async (req: Request, res: Response) => {
        const groupId = req.params.groupId;
        const body = req.body as SendMessageDTO
        const userId = body.userId;
        const sentMessage = await this._service.sendMessage(groupId, userId, body.text);
        const dto = mapMessage(sentMessage);
        if (dto) {
            broadcastChat(groupId, dto);
            return ApiResponse.success(res, dto)
        } else {
            return ApiResponse.error(res, 'Error mapping message', HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}
