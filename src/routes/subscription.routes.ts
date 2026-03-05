import { Router } from 'express'
import { container } from 'tsyringe'
import { SubscriptionController } from '../controllers/subscriptionController'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class SubscriptionRoutes {
    public router: Router;
    private _controller: SubscriptionController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(SubscriptionController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/', this._controller.getPlans)
        this.router.post('/subscribe', auth, this._controller.subscribe)
        this.router.post('/cancel', auth, this._controller.cancel)
        this.router.post('/resume', auth, this._controller.resume)
        this.router.get('/history', auth, this._controller.history)
    }
}
