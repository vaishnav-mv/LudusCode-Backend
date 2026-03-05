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
        this.router.post('/', auth, validate(CreateDuelSchema), this._controller.createDuel)
        this.router.get('/open', this._controller.listOpenDuels)
        this.router.get('/invites', auth, this._controller.listInvites)
        this.router.get('/active', auth, this._controller.listActiveDuels)
        this.router.post('/open', auth, validate(CreateOpenChallengeSchema), this._controller.createOpenChallenge)
        this.router.get('/:id', this._controller.duelDetail)
        this.router.get('/:id/summary', auth, this._controller.getDuelSummary)
        this.router.post('/:id/summary', validate(SetSummarySchema), this._controller.setDuelSummary)
        this.router.post('/:id/finish', validate(FinishDuelSchema), this._controller.finishDuel)
        this.router.post('/:id/submit', auth, validate(SubmitDuelResultSchema), this._controller.submitDuelResult)
        this.router.post('/:id/join', auth, validate(DuelPlayerActionSchema), this._controller.joinDuel)
        this.router.post('/:id/cancel', auth, validate(DuelPlayerActionSchema), this._controller.cancelDuel)
        this.router.post('/:id/timeout', auth, this._controller.timeoutDuel)
        this.router.post('/:id/forfeit', auth, this._controller.forfeitDuel)
        this.router.patch('/:id/state', auth, validate(UpdateDuelStateSchema), this._controller.updateDuelState)
    }
}
