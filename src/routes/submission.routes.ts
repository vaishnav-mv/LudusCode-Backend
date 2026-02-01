import { Router } from 'express'
import { container } from 'tsyringe'
import { SubmissionController } from '../controllers/submissionController'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth

export class SubmissionRoutes {
    public router: Router;
    private _controller: SubmissionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(SubmissionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, (req, res, next) => this._controller.create(req, res).catch(next))
        this.router.get('/user/me', auth, (req, res, next) => this._controller.getUserSubmissions(req, res).catch(next))
        this.router.get('/user/:userId/solved', auth, (req, res, next) => this._controller.getSolvedProblems(req, res).catch(next))
        this.router.get('/user/:userId', auth, (req, res, next) => this._controller.getUserSubmissions(req, res).catch(next))
    }
}
