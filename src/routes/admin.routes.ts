import { Router } from 'express'
import { container } from 'tsyringe'
import { AdminController } from '../controllers/adminController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
import { ForceDuelResultSchema, AdminNoBodySchema } from '../dto/request/admin.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth
const requireAdmin = AuthMiddleware.getInstance().roleGuard('admin')

export class AdminRoutes {
    public router: Router;
    private _controller: AdminController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AdminController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/dashboard-stats', auth, requireAdmin, (req, res, next) => this._controller.dashboardStats(req, res).catch(next))
        this.router.get('/financials', auth, requireAdmin, (req, res, next) => this._controller.financials(req, res).catch(next))
        this.router.get('/subscriptions', auth, requireAdmin, (req, res, next) => this._controller.subscriptionData(req, res).catch(next))
        this.router.post('/subscriptions/plans', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.createPlan(req, res).catch(next))
        this.router.put('/subscriptions/plans/:id', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.updatePlan(req, res).catch(next))
        this.router.delete('/subscriptions/plans/:id', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.deletePlan(req, res).catch(next))
        this.router.post('/subscriptions/grant', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.grantSubscription(req, res).catch(next))
        this.router.post('/subscriptions/cancel/:userId', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.cancelSubscription(req, res).catch(next))
        this.router.get('/problems/pending', auth, requireAdmin, (req, res, next) => this._controller.pendingProblems(req, res).catch(next))
        this.router.post('/problems/:id/approve', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.approveProblem(req, res).catch(next))
        this.router.post('/problems/:id/reject', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.rejectProblem(req, res).catch(next))
        this.router.get('/problems', auth, requireAdmin, (req, res, next) => this._controller.allProblems(req, res).catch(next))
        this.router.get('/users', auth, requireAdmin, (req, res, next) => this._controller.allUsers(req, res).catch(next))
        this.router.post('/users/:id/ban', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.banUser(req, res).catch(next))
        this.router.post('/users/:id/unban', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.unbanUser(req, res).catch(next))
        this.router.get('/users/search', auth, requireAdmin, (req, res, next) => this._controller.searchUsers(req, res).catch(next))
        this.router.get('/anti-cheat/flagged', auth, requireAdmin, (req, res, next) => this._controller.flaggedActivities(req, res).catch(next))
        this.router.post('/anti-cheat/users/:id/clear-flags', auth, requireAdmin, validate(AdminNoBodySchema), (req, res, next) => this._controller.clearFlags(req, res).catch(next))
        this.router.get('/duels', auth, requireAdmin, (req, res, next) => this._controller.monitoredDuels(req, res).catch(next))
        this.router.post('/duels/:id/cancel', auth, requireAdmin, (req, res, next) => this._controller.cancelDuel(req, res).catch(next))
        this.router.post('/duels/:id/force-result', auth, requireAdmin, validate(ForceDuelResultSchema), (req, res, next) => this._controller.forceDuelResult(req, res).catch(next))
    }
}
