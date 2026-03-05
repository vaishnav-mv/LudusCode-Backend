import { Router } from 'express'
import { container } from 'tsyringe'
import { ProblemController } from '../controllers/problemController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth
const requireAdmin = container.resolve(AuthMiddleware).roleGuard('admin')
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
        this.router.get('/approved', this._controller.approvedProblems)
        this.router.get('/daily', this._controller.dailyProblem)
        this.router.post('/', auth, this._controller.createProblem)
        this.router.post('/generate', auth, requireAdmin, validate(GenerateProblemSchema), this._controller.generateProblem)
        this.router.put('/:id', auth, requireAdmin, this._controller.updateProblem)
    }
}

