import { Router } from 'express'
import { container } from 'tsyringe'
import { AdminController } from '../controllers/adminController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { ForceDuelResultSchema, AdminNoBodySchema } from '../dto/request/admin.request.dto'

export class AdminRoutes {
    public router: Router;
    private _controller: AdminController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AdminController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/dashboard-stats', (req, res, next) => this._controller.dashboardStats(req, res).catch(next))
        this.router.get('/financials', (req, res, next) => this._controller.financials(req, res).catch(next))
        this.router.get('/subscriptions', (req, res, next) => this._controller.subscriptionData(req, res).catch(next))
        this.router.post('/subscriptions/plans', validate(AdminNoBodySchema), (req, res, next) => this._controller.createPlan(req, res).catch(next))
        this.router.put('/subscriptions/plans/:id', validate(AdminNoBodySchema), (req, res, next) => this._controller.updatePlan(req, res).catch(next))
        this.router.delete('/subscriptions/plans/:id', validate(AdminNoBodySchema), (req, res, next) => this._controller.deletePlan(req, res).catch(next))
        this.router.post('/subscriptions/grant', validate(AdminNoBodySchema), (req, res, next) => this._controller.grantSubscription(req, res).catch(next))
        this.router.post('/subscriptions/cancel/:userId', validate(AdminNoBodySchema), (req, res, next) => this._controller.cancelSubscription(req, res).catch(next))
        this.router.get('/problems/pending', (req, res, next) => this._controller.pendingProblems(req, res).catch(next))
        this.router.post('/problems/:id/approve', validate(AdminNoBodySchema), (req, res, next) => this._controller.approveProblem(req, res).catch(next))
        this.router.post('/problems/:id/reject', validate(AdminNoBodySchema), (req, res, next) => this._controller.rejectProblem(req, res).catch(next))
        this.router.get('/problems', (req, res, next) => this._controller.allProblems(req, res).catch(next))
        this.router.get('/users', (req, res, next) => this._controller.allUsers(req, res).catch(next))
        this.router.post('/users/:id/ban', validate(AdminNoBodySchema), (req, res, next) => this._controller.banUser(req, res).catch(next))
        this.router.post('/users/:id/unban', validate(AdminNoBodySchema), (req, res, next) => this._controller.unbanUser(req, res).catch(next))
        this.router.get('/users/search', (req, res, next) => this._controller.searchUsers(req, res).catch(next))
        this.router.get('/anti-cheat/flagged', (req, res, next) => this._controller.flaggedActivities(req, res).catch(next))
        this.router.post('/anti-cheat/users/:id/clear-flags', validate(AdminNoBodySchema), (req, res, next) => this._controller.clearFlags(req, res).catch(next))
        this.router.get('/duels', (req, res, next) => this._controller.monitoredDuels(req, res).catch(next))
        this.router.post('/duels/:id/cancel', (req, res, next) => this._controller.cancelDuel(req, res).catch(next))
        this.router.post('/duels/:id/force-result', validate(ForceDuelResultSchema), (req, res, next) => this._controller.forceDuelResult(req, res).catch(next))
    }
}
