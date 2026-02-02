import { Router } from 'express'
import { container } from 'tsyringe'
import { StudySessionController } from '../controllers/studySessionController'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class StudySessionRoutes {
    public router: Router;
    private _controller: StudySessionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(StudySessionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, this._controller.create)
        this.router.get('/group/:groupId', auth, this._controller.list)
        this.router.get('/:id', auth, this._controller.detail)
        this.router.put('/:id', auth, this._controller.update)
        this.router.post('/:id/join', auth, this._controller.join)
        this.router.post('/:id/leave', auth, this._controller.leave)
        this.router.post('/:id/pass-turn', auth, this._controller.passTurn)
    }
}
