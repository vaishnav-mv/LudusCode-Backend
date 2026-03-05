import { Router } from 'express'
import { container } from 'tsyringe'
import { WalletController } from '../controllers/walletController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { DepositSchema, VerifySchema, WithdrawSchema, WagerSchema, WinSchema } from '../dto/request/wallet.request.dto'
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
        this.router.get('/:userId/transactions', auth, this._controller.getTransactions)
        this.router.get('/:userId', auth, this._controller.getWallet)
        this.router.post('/deposit', auth, validate(DepositSchema), this._controller.deposit)
        this.router.post('/verify', auth, validate(VerifySchema), this._controller.verify)
        this.router.post('/withdraw', auth, validate(WithdrawSchema), this._controller.withdraw)
        this.router.post('/wager', auth, validate(WagerSchema), this._controller.wager)
        this.router.post('/win', auth, validate(WinSchema), this._controller.win)
    }
}

