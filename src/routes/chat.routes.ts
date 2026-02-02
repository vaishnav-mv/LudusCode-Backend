import { Router } from 'express'
import { container } from 'tsyringe'
import { ChatController } from '../controllers/chatController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { SendMessageSchema } from '../dto/request/chat.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth

export class ChatRoutes {
    public router: Router;
    private _controller: ChatController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(ChatController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/:groupId/messages', auth, (req, res, next) => this._controller.getMessages(req, res).catch(next))
        this.router.post('/:groupId/messages', auth, validate(SendMessageSchema), (req, res, next) => this._controller.sendMessage(req, res).catch(next))
    }
}
