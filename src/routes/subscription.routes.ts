import { Router } from 'express'
import { container } from 'tsyringe'
import { SubscriptionController } from '../controllers/subscriptionController'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth

export class SubscriptionRoutes {
    public router: Router;
    private _controller: SubscriptionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(SubscriptionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/', (req, res, next) => this._controller.getPlans(req, res).catch(next))
        this.router.post('/subscribe', auth, (req, res, next) => this._controller.subscribe(req, res).catch(next))
    }
}
