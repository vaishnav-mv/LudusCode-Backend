import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { broadcastChat } from '../realtime/ws'
import { IChatService } from '../interfaces/services'
import { SendMessageDTO } from '../dto/request/chat.request.dto'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler } from "../utils/asyncHandler";

@singleton()
export class ChatController {
    constructor(@inject("IChatService") private _service: IChatService) { }

    /**
     * @desc    Get messages for a group
     * @route   GET /api/chat/:groupId/messages
     * @req     params: { groupId }
     * @res     [Message]
     */
    getMessages = asyncHandler(async (req: Request, res: Response) => {
        const groupId = req.params.groupId;
        const messages = await this._service.getMessages(groupId);
        return ApiResponse.success(res, messages)
    })

    /**
     * @desc    Send a message to a group
     * @route   POST /api/chat/:groupId/messages
     * @req     params: { groupId }, body: { userId, text }
     * @res     { message }
     */
    sendMessage = asyncHandler(async (req: Request, res: Response) => {
        const groupId = req.params.groupId;
        const body = req.body as SendMessageDTO
        const userId = body.userId;
        const dto = await this._service.sendMessage(groupId, userId, body.text);
        broadcastChat(groupId, dto);
        return ApiResponse.success(res, dto)
    })
}
