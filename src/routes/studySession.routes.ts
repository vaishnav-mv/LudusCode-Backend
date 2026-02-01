import { Router } from 'express'
import { container } from 'tsyringe'
import { StudySessionController } from '../controllers/studySessionController'

export class StudySessionRoutes {
    public router: Router;
    private _controller: StudySessionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(StudySessionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', this._controller.create)
        this.router.get('/group/:groupId', this._controller.list)
        this.router.get('/:id', this._controller.detail)
        this.router.put('/:id', this._controller.update)
        this.router.post('/:id/join', this._controller.join)
        this.router.post('/:id/leave', this._controller.leave)
        this.router.post('/:id/pass-turn', this._controller.passTurn)
    }
}
