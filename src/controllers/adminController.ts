import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'

import { IAdminService } from '../interfaces/services'
import { ForceDuelResultDTO } from '../dto/request/admin.request.dto'

@singleton()
export class AdminController {
  constructor(
    @inject("IAdminService") private _service: IAdminService
  ) { }

  /**
   * @desc    Get dashboard stats
   * @route   GET /api/admin/dashboard-stats
   * @req     -
   * @res     { totalUsers, activeDuels, totalProblems, totalRevenue }
   */
  dashboardStats = async (req: Request, res: Response) => {
    const stats = await this._service.dashboardStats()
    res.json(stats)
  }

  /**
   * @desc    Get financial data
   * @route   GET /api/admin/financials
   * @req     -
   * @res     { totalRevenue, commissionsByDay }
   */
  financials = async (req: Request, res: Response) => {
    const financialData = await this._service.financials()
    res.json(financialData)
  }

  /**
   * @desc    Get subscription data
   * @route   GET /api/admin/subscriptions
   * @req     -
   * @res     { plans, logs }
   */
  subscriptionData = async (req: Request, res: Response) => {
    const subscriptionData = await this._service.subscriptionData()
    res.json(subscriptionData)
  }

  /**
   * @desc    Create a subscription plan
   * @route   POST /api/admin/subscriptions/plans
   * @req     body: { name, price, period, features }
   * @res     { plan }
   */
  createPlan = async (req: Request, res: Response) => {
    const plan = await (this._service as any).createPlan(req.body)
    res.json(plan)
  }

  /**
   * @desc    Update a subscription plan
   * @route   PUT /api/admin/subscriptions/plans/:id
   * @req     params: { id }, body: { name, price, period, features }
   * @res     { plan }
   */
  updatePlan = async (req: Request, res: Response) => {
    const updatedPlan = await (this._service as any).updatePlan(req.params.id, req.body)
    res.json(updatedPlan)
  }

  /**
   * @desc    Delete a subscription plan
   * @route   DELETE /api/admin/subscriptions/plans/:id
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  deletePlan = async (req: Request, res: Response) => {
    const success = await (this._service as any).deletePlan(req.params.id)
    res.json({ ok: success })
  }

  /**
   * @desc    Grant subscription to a user
   * @route   POST /api/admin/subscriptions/grant
   * @req     body: { username, planId }
   * @res     { ok: boolean }
   */
  grantSubscription = async (req: Request, res: Response) => {
    const { username, planId } = req.body
    const success = await (this._service as any).grantSubscription(username, planId)
    res.json({ ok: success })
  }

  /**
   * @desc    Cancel a user's subscription
   * @route   POST /api/admin/subscriptions/cancel/:userId
   * @req     params: { userId }
   * @res     { ok: boolean }
   */
  cancelSubscription = async (req: Request, res: Response) => {
    const success = await (this._service as any).cancelSubscription(req.params.userId)
    res.json({ ok: success })
  }

  /**
   * @desc    Get pending problems
   * @route   GET /api/admin/problems/pending
   * @req     -
   * @res     [Problem]
   */
  pendingProblems = async (req: Request, res: Response) => {
    const pending = await this._service.pendingProblems()
    res.json(pending)
  }

  /**
   * @desc    Approve a problem
   * @route   POST /api/admin/problems/:id/approve
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  approveProblem = async (req: Request, res: Response) => {
    const ok = await this._service.approveProblem(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Reject a problem
   * @route   POST /api/admin/problems/:id/reject
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  rejectProblem = async (req: Request, res: Response) => {
    const ok = await this._service.rejectProblem(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Get all problems (paginated)
   * @route   GET /api/admin/problems
   * @req     query: { page, limit }
   * @res     { problems, total, page, totalPages }
   */
  allProblems = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const result = await this._service.allProblems(page, limit)
    res.json(result)
  }

  /**
   * @desc    Get all users (paginated)
   * @route   GET /api/admin/users
   * @req     query: { page, limit }
   * @res     { users, total, page, totalPages }
   */
  allUsers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const query = req.query.q as string
    const result = await this._service.allUsers(page, limit, query)
    res.json(result)
  }

  /**
   * @desc    Ban a user
   * @route   POST /api/admin/users/:id/ban
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  banUser = async (req: Request, res: Response) => {
    const ok = await this._service.banUser(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Unban a user
   * @route   POST /api/admin/users/:id/unban
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  unbanUser = async (req: Request, res: Response) => {
    const ok = await this._service.unbanUser(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Search for users
   * @route   GET /api/admin/users/search
   * @req     query: { q }
   * @res     [User]
   */
  searchUsers = async (req: Request, res: Response) => {
    const query = req.query.q as string
    if (!query) {
      return res.json([])
    }
    const users = await (this._service as any).searchUsers(query)
    res.json(users)
  }

  /**
   * @desc    Get flagged activities
   * @route   GET /api/admin/anti-cheat/flagged
   * @req     -
   * @res     [FlaggedUser]
   */
  flaggedActivities = async (req: Request, res: Response) => {
    const flagged = await this._service.flaggedActivities()
    res.json(flagged)
  }

  /**
   * @desc    Clear flags for a user
   * @route   POST /api/admin/anti-cheat/users/:id/clear-flags
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  clearFlags = async (req: Request, res: Response) => {
    const ok = await this._service.clearFlags(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Get monitored duels
   * @route   GET /api/admin/duels
   * @req     -
   * @res     [Duel]
   */
  monitoredDuels = async (req: Request, res: Response) => {
    const duels = await this._service.monitoredDuels()
    res.json(duels)
  }

  /**
   * @desc    Cancel a duel (Admin override)
   * @route   POST /api/admin/duels/:id/cancel
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  cancelDuel = async (req: Request, res: Response) => {
    const ok = await this._service.cancelDuel(req.params.id)
    res.json({ ok })
  }

  /**
   * @desc    Force a duel result
   * @route   POST /api/admin/duels/:id/force-result
   * @req     params: { id }, body: { winnerId }
   * @res     { ok: boolean }
   */
  forceDuelResult = async (req: Request, res: Response) => {
    const body = req.body as ForceDuelResultDTO
    const ok = await this._service.forceDuelResult(req.params.id, body.winnerId)
    res.json({ ok })
  }
}
