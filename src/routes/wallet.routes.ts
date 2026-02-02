import { Router } from 'express'
import { container } from 'tsyringe'
import { WalletController } from '../controllers/walletController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { DepositSchema, WithdrawSchema, WagerSchema, WinSchema } from '../dto/request/wallet.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class WalletRoutes {
    public router: Router;
    private _controller: WalletController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(WalletController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/:userId', auth, (req, res, next) => this._controller.getWallet(req, res).catch(next))
        this.router.post('/deposit', auth, validate(DepositSchema), (req, res, next) => this._controller.deposit(req, res).catch(next))
        this.router.post('/withdraw', auth, validate(WithdrawSchema), (req, res, next) => this._controller.withdraw(req, res).catch(next))
        this.router.post('/wager', auth, validate(WagerSchema), (req, res, next) => this._controller.wager(req, res).catch(next))
        this.router.post('/win', auth, validate(WinSchema), (req, res, next) => this._controller.win(req, res).catch(next))
    }
}

