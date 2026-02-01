import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { resolveGroupId, resolveUserId } from '../utils/idResolver'
import { broadcastChat } from '../realtime/ws'
import { IChatService } from '../interfaces/services'
import { SendMessageDTO } from '../dto/request/chat.request.dto'

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
        const gid = await resolveGroupId(req.params.groupId);
        const r = await this._service.getMessages(gid);
        res.json(r);
    }

    /**
     * @desc    Send a message to a group
     * @route   POST /api/chat/:groupId/messages
     * @req     params: { groupId }, body: { userId, text }
     * @res     { message }
     */
    sendMessage = async (req: Request, res: Response) => {
        const gid = await resolveGroupId(req.params.groupId);
        const body = req.body as SendMessageDTO
        const uid = await resolveUserId(body.userId);
        const r = await this._service.sendMessage(gid, uid, body.text);
        broadcastChat(gid, r);

        res.json(r);
    }
}
