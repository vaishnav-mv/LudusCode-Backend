import { Router } from 'express'
import { container } from 'tsyringe'
import { SubmissionController } from '../controllers/submissionController'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class SubmissionRoutes {
    public router: Router;
    private _controller: SubmissionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(SubmissionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, this._controller.create)
        this.router.get('/user/me', auth, this._controller.getUserSubmissions)
        this.router.get('/user/:userId/solved', auth, this._controller.getSolvedProblems)
        this.router.get('/user/:userId', auth, this._controller.getUserSubmissions)
    }
}
