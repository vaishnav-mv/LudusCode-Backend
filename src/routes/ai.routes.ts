import { Router } from 'express'
import { container } from 'tsyringe'
import { AiController } from '../controllers/aiController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { HintSchema, CodeReviewSchema, PerformanceSchema } from '../dto/request/ai.request.dto'

export class AiRoutes {
    public router: Router;
    private _controller: AiController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AiController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/hint', validate(HintSchema), (req, res, next) => this._controller.hint(req, res).catch(next))
        this.router.post('/code-review', validate(CodeReviewSchema), (req, res, next) => this._controller.codeReview(req, res).catch(next))
        this.router.post('/performance', validate(PerformanceSchema), (req, res, next) => this._controller.performance(req, res).catch(next))
        this.router.post('/explain-concept', (req, res, next) => this._controller.explainConcept(req, res).catch(next))
        this.router.post('/summarize-discussion', (req, res, next) => this._controller.summarizeDiscussion(req, res).catch(next))
        this.router.post('/generate-problem', (req, res, next) => this._controller.generateProblem(req, res).catch(next))
    }
}
