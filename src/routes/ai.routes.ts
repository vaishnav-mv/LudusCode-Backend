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
        this.router.post('/hint', auth, validate(HintSchema), (req, res, next) => this._controller.hint(req, res).catch(next))
        this.router.post('/code-review', auth, validate(CodeReviewSchema), (req, res, next) => this._controller.codeReview(req, res).catch(next))
        this.router.post('/performance', auth, validate(PerformanceSchema), (req, res, next) => this._controller.performance(req, res).catch(next))
        this.router.post('/generate-problem', auth, (req, res, next) => this._controller.generateProblem(req, res).catch(next))
        this.router.post('/live-complexity', auth, requirePremium, validate(ComplexitySchema), (req, res, next) => this._controller.liveComplexity(req, res).catch(next))
        this.router.post('/optimize', auth, requirePremium, validate(CodeReviewSchema), (req, res, next) => this._controller.optimize(req, res).catch(next))
        this.router.post('/edge-cases', auth, requirePremium, validate(CodeReviewSchema), (req, res, next) => this._controller.edgeCases(req, res).catch(next))
    }
}
