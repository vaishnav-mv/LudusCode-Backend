import { Router } from 'express'
import { container } from 'tsyringe'
import { AdminController } from '../controllers/adminController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { ForceDuelResultSchema, AdminNoBodySchema } from '../dto/request/admin.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth
const requireAdmin = container.resolve(AuthMiddleware).roleGuard('admin')

export class AdminRoutes {
    public router: Router;
    private _controller: AdminController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AdminController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/dashboard-stats', auth, requireAdmin, this._controller.dashboardStats)
        this.router.get('/financials', auth, requireAdmin, this._controller.financials)
        this.router.get('/subscriptions', auth, requireAdmin, this._controller.subscriptionData)
        this.router.post('/subscriptions/plans', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.createPlan)
        this.router.put('/subscriptions/plans/:id', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.updatePlan)
        this.router.delete('/subscriptions/plans/:id', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.deletePlan)
        this.router.post('/subscriptions/grant', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.grantSubscription)
        this.router.post('/subscriptions/cancel/:userId', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.cancelSubscription)
        this.router.get('/problems/pending', auth, requireAdmin, this._controller.pendingProblems)
        this.router.post('/problems/:id/approve', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.approveProblem)
        this.router.post('/problems/:id/reject', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.rejectProblem)
        this.router.get('/problems', auth, requireAdmin, this._controller.allProblems)
        this.router.get('/users', auth, requireAdmin, this._controller.allUsers)
        this.router.post('/users/:id/ban', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.banUser)
        this.router.post('/users/:id/unban', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.unbanUser)
        this.router.get('/users/search', auth, requireAdmin, this._controller.searchUsers)
        this.router.get('/anti-cheat/flagged', auth, requireAdmin, this._controller.flaggedActivities)
        this.router.get('/duels', auth, requireAdmin, this._controller.monitoredDuels)
        this.router.post('/duels/:id/cancel', auth, requireAdmin, this._controller.cancelDuel)
        this.router.post('/duels/:id/force-result', auth, requireAdmin, validate(ForceDuelResultSchema), this._controller.forceDuelResult)

        // Admin Wallet Management (Gap 10)
        this.router.get('/wallet/:userId', auth, requireAdmin, this._controller.getUserWallet)
        this.router.get('/transactions', auth, requireAdmin, this._controller.getAllTransactions)
        this.router.post('/wallet/:userId/adjust', auth, requireAdmin, this._controller.adjustBalance)

        // Payout Approvals
        this.router.post('/payouts/:id/approve', auth, requireAdmin, validate(AdminNoBodySchema), this._controller.approvePayout)
        this.router.post('/payouts/:id/reject', auth, requireAdmin, this._controller.rejectPayout)
    }
}
