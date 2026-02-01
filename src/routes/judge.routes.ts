import { Router } from 'express'
import { container } from 'tsyringe'
import { JudgeController } from '../controllers/judgeController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { ExecuteSchema } from '../dto/request/judge.request.dto'

export class JudgeRoutes {
    public router: Router;
    private _controller: JudgeController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(JudgeController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/execute', validate(ExecuteSchema), (req, res, next) => this._controller.execute(req, res).catch(next))
    }
}

