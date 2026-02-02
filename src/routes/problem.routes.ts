import { Router } from 'express'
import { container } from 'tsyringe'
import { ProblemController } from '../controllers/problemController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth
const requireAdmin = AuthMiddleware.getInstance().roleGuard('admin')
import { GenerateProblemSchema } from '../dto/request/problem.request.dto'

export class ProblemRoutes {
    public router: Router;
    private _controller: ProblemController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(ProblemController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/approved', (req, res, next) => this._controller.approvedProblems(req, res).catch(next))
        this.router.get('/daily', (req, res, next) => this._controller.dailyProblem(req, res).catch(next))
        this.router.post('/', auth, (req, res, next) => this._controller.createProblem(req, res).catch(next))
        this.router.post('/generate', auth, requireAdmin, validate(GenerateProblemSchema), (req, res, next) => this._controller.generateProblem(req, res).catch(next))
    }
}

