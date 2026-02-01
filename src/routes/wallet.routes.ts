import { Router } from 'express'
import { container } from 'tsyringe'
import { WalletController } from '../controllers/walletController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { DepositSchema, WithdrawSchema, WagerSchema, WinSchema } from '../dto/request/wallet.request.dto'

export class WalletRoutes {
    public router: Router;
    private _controller: WalletController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(WalletController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/:userId', (req, res, next) => this._controller.getWallet(req, res).catch(next))
        this.router.post('/deposit', validate(DepositSchema), (req, res, next) => this._controller.deposit(req, res).catch(next))
        this.router.post('/withdraw', validate(WithdrawSchema), (req, res, next) => this._controller.withdraw(req, res).catch(next))
        this.router.post('/wager', validate(WagerSchema), (req, res, next) => this._controller.wager(req, res).catch(next))
        this.router.post('/win', validate(WinSchema), (req, res, next) => this._controller.win(req, res).catch(next))
    }
}

