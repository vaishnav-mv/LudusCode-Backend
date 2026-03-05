import { Router } from 'express'
import { container } from 'tsyringe'
import { AiController } from '../controllers/aiController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { HintSchema, CodeReviewSchema, PerformanceSchema, ComplexitySchema } from '../dto/request/ai.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth
import { PermissionsMiddleware } from '../middleware/permissions'
const requirePremium = container.resolve(PermissionsMiddleware).requirePremium

export class AiRoutes {
    public router: Router;
    private _controller: AiController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AiController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/hint', auth, validate(HintSchema), this._controller.hint)
        this.router.post('/code-review', auth, validate(CodeReviewSchema), this._controller.codeReview)
        this.router.post('/performance', auth, validate(PerformanceSchema), this._controller.performance)
        this.router.post('/generate-problem', auth, this._controller.generateProblem)
        this.router.post('/live-complexity', auth, requirePremium, validate(ComplexitySchema), this._controller.liveComplexity)
        this.router.post('/optimize', auth, requirePremium, validate(CodeReviewSchema), this._controller.optimize)
        this.router.post('/edge-cases', auth, requirePremium, validate(CodeReviewSchema), this._controller.edgeCases)
    }
}
