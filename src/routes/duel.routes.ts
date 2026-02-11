import { Router } from 'express'
import { container } from 'tsyringe'
import { DuelController } from '../controllers/duelController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { CreateDuelSchema, UpdateDuelStateSchema, CreateOpenChallengeSchema, SetSummarySchema, FinishDuelSchema, SubmitDuelResultSchema, DuelPlayerActionSchema } from '../dto/request/duel.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class DuelRoutes {
    public router: Router;
    private _controller: DuelController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(DuelController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/', auth, validate(CreateDuelSchema), (req, res, next) => this._controller.createDuel(req, res).catch(next))
        this.router.get('/open', (req, res, next) => this._controller.listOpenDuels(req, res).catch(next))
        this.router.get('/active', auth, (req, res, next) => this._controller.listActiveDuels(req, res).catch(next))
        this.router.post('/open', auth, validate(CreateOpenChallengeSchema), (req, res, next) => this._controller.createOpenChallenge(req, res).catch(next))
        this.router.get('/:id', (req, res, next) => this._controller.duelDetail(req, res).catch(next))
        this.router.get('/:id/summary', (req, res, next) => this._controller.getDuelSummary(req, res).catch(next))
        this.router.post('/:id/summary', validate(SetSummarySchema), (req, res, next) => this._controller.setDuelSummary(req, res).catch(next))
        this.router.post('/:id/finish', validate(FinishDuelSchema), (req, res, next) => this._controller.finishDuel(req, res).catch(next))
        this.router.post('/:id/submit', auth, validate(SubmitDuelResultSchema), (req, res, next) => this._controller.submitDuelResult(req, res).catch(next))
        this.router.post('/:id/join', auth, validate(DuelPlayerActionSchema), (req, res, next) => this._controller.joinDuel(req, res).catch(next))
        this.router.post('/:id/cancel', auth, validate(DuelPlayerActionSchema), (req, res, next) => this._controller.cancelDuel(req, res).catch(next))
        this.router.post('/:id/timeout', auth, (req, res, next) => this._controller.timeoutDuel(req, res).catch(next))
        this.router.patch('/:id/state', auth, validate(UpdateDuelStateSchema), (req, res, next) => this._controller.updateDuelState(req, res).catch(next))
    }
}
