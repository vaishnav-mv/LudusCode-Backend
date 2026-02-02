import { Router } from 'express'
import { container } from 'tsyringe'
import { AiController } from '../controllers/aiController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { HintSchema, CodeReviewSchema, PerformanceSchema } from '../dto/request/ai.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth

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
        this.router.post('/explain-concept', auth, (req, res, next) => this._controller.explainConcept(req, res).catch(next))
        this.router.post('/summarize-discussion', auth, (req, res, next) => this._controller.summarizeDiscussion(req, res).catch(next))
        this.router.post('/generate-problem', auth, (req, res, next) => this._controller.generateProblem(req, res).catch(next))
    }
}
