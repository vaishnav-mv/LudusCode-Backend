import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'

import { HttpStatus } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IAdminService, IDuelService } from '../interfaces/services'
import { ForceDuelResultDTO } from '../dto/request/admin.request.dto'

@singleton()
export class AdminController {
  constructor(
    @inject("IAdminService") private _service: IAdminService,
    @inject("IDuelService") private _duelService: IDuelService
  ) { }

  /**
   * @desc    Get dashboard stats
   * @route   GET /api/admin/dashboard-stats
   * @req     -
   * @res     { totalUsers, activeDuels, totalProblems, totalRevenue }
   */
  dashboardStats = async (req: Request, res: Response) => {
    const stats = await this._service.dashboardStats()
    return ApiResponse.success(res, stats)
  }

  /**
   * @desc    Get financial data
   * @route   GET /api/admin/financials
   * @req     -
   * @res     { totalRevenue, commissionsByDay }
   */
  financials = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const financialData = await this._service.financials(page, limit)
    return ApiResponse.success(res, financialData)
  }

  /**
   * @desc    Get subscription data
   * @route   GET /api/admin/subscriptions
   * @req     -
   * @res     { plans, logs, total, page, totalPages }
   */
  subscriptionData = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const action = req.query.action as string | undefined
    const sortStr = req.query.sortStr as string | undefined
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined
    const q = req.query.q as string | undefined

    const data = await this._service.subscriptionData(page, limit, { action, sortStr, sortOrder, query: q })
    return ApiResponse.success(res, data)
  }



  /**
   * @desc    Create a subscription plan
   * @route   POST /api/admin/subscriptions/plans
   * @req     body: { name, price, period, features }
   * @res     { plan }
   */
  createPlan = async (req: Request, res: Response) => {
    const plan = await this._service.createPlan(req.body)
    return ApiResponse.success(res, plan)
  }

  /**
   * @desc    Update a subscription plan
   * @route   PUT /api/admin/subscriptions/plans/:id
   * @req     params: { id }, body: { name, price, period, features }
   * @res     { plan }
   */
  updatePlan = async (req: Request, res: Response) => {
    const updatedPlan = await this._service.updatePlan(req.params.id, req.body)
    return ApiResponse.success(res, updatedPlan)
  }

  /**
   * @desc    Delete a subscription plan
   * @route   DELETE /api/admin/subscriptions/plans/:id
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  deletePlan = async (req: Request, res: Response) => {
    const success = await this._service.deletePlan(req.params.id)
    return ApiResponse.success(res, { ok: success })
  }

  /**
   * @desc    Grant subscription to a user
   * @route   POST /api/admin/subscriptions/grant
   * @req     body: { username, planId }
   * @res     { ok: boolean }
   */
  grantSubscription = async (req: Request, res: Response) => {
    const { username, planId } = req.body
    const success = await this._service.grantSubscription(username, planId)
    return ApiResponse.success(res, { ok: success })
  }

  /**
   * @desc    Cancel a user's subscription
   * @route   POST /api/admin/subscriptions/cancel/:userId
   * @req     params: { userId }
   * @res     { ok: boolean }
   */
  cancelSubscription = async (req: Request, res: Response) => {
    const success = await this._service.cancelSubscription(req.params.userId)
    return ApiResponse.success(res, { ok: success })
  }

  /**
   * @desc    Get pending problems
   * @route   GET /api/admin/problems/pending
   * @req     -
   * @res     [Problem]
   */
  pendingProblems = async (req: Request, res: Response) => {
    const pending = await this._service.pendingProblems()
    return ApiResponse.success(res, pending)
  }

  /**
   * @desc    Approve a problem
   * @route   POST /api/admin/problems/:id/approve
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  approveProblem = async (req: Request, res: Response) => {
    const ok = await this._service.approveProblem(req.params.id)
    return ApiResponse.success(res, { ok })
  }

  /**
   * @desc    Reject a problem
   * @route   POST /api/admin/problems/:id/reject
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  rejectProblem = async (req: Request, res: Response) => {
    const ok = await this._service.rejectProblem(req.params.id)
    return ApiResponse.success(res, { ok })
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
    return ApiResponse.success(res, result)
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
    return ApiResponse.success(res, result)
  }

  /**
   * @desc    Ban a user
   * @route   POST /api/admin/users/:id/ban
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  banUser = async (req: Request, res: Response) => {
    const ok = await this._service.banUser(req.params.id)
    return ApiResponse.success(res, { ok })
  }

  /**
   * @desc    Unban a user
   * @route   POST /api/admin/users/:id/unban
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  unbanUser = async (req: Request, res: Response) => {
    const ok = await this._service.unbanUser(req.params.id)
    return ApiResponse.success(res, { ok })
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
      return ApiResponse.success(res, [])
    }
    const users = await this._service.searchUsers(query)
    return ApiResponse.success(res, users)
  }

  /**
   * @desc    Get flagged activities
   * @route   GET /api/admin/anti-cheat/flagged
   * @req     -
   * @res     [FlaggedUser]
   */
  flaggedActivities = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const flagged = await this._service.flaggedActivities(page, limit)
    return ApiResponse.success(res, flagged)
  }

  /**
   * @desc    Get monitored duels
   * @route   GET /api/admin/duels
   * @req     -
   * @res     [Duel]
   */
  monitoredDuels = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const result = await this._service.monitoredDuels(page, limit)
    return ApiResponse.success(res, result)
  }

  /**
   * @desc    Cancel a duel (Admin override)
   * @route   POST /api/admin/duels/:id/cancel
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  cancelDuel = async (req: Request, res: Response) => {
    const ok = await this._service.cancelDuel(req.params.id)
    return ApiResponse.success(res, { ok })
  }

  /**
   * @desc    Force a duel result
   * @route   POST /api/admin/duels/:id/force-result
   * @req     params: { id }, body: { winnerId }
   * @res     { ok: boolean }
   */
  forceDuelResult = async (req: Request, res: Response) => {
    const body = req.body as ForceDuelResultDTO
    try {
      const result = await this._duelService.finish(req.params.id, body.winnerId);
      return ApiResponse.success(res, { ok: !!result })
    } catch {
      return ApiResponse.error(res, "Failed to force result", HttpStatus.INTERNAL_SERVER_ERROR, { ok: false })
    }
  }

  /**
   * @desc    Get a user's wallet details
   * @route   GET /api/admin/wallet/:userId
   * @req     params: { userId }
   * @res     { balance, currency }
   */
  getUserWallet = async (req: Request, res: Response) => {
    const wallet = await this._service.getUserWallet(req.params.userId)
    return ApiResponse.success(res, wallet)
  }

  /**
   * @desc    Get all platform transactions
   * @route   GET /api/admin/transactions
   * @req     query: { page, limit }
   * @res     { transactions, total, page, totalPages }
   */
  getAllTransactions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined
    const sort = req.query.sort as string | undefined
    const query = req.query.query as string | undefined
    const result = await this._service.getAllTransactions(page, limit, { status, type, sort, query })
    return ApiResponse.success(res, result)
  }

  /**
   * @desc    Adjust a user's wallet balance (credit or debit)
   * @route   POST /api/admin/wallet/:userId/adjust
   * @req     params: { userId }, body: { amount, description }
   * @res     { ok: boolean }
   */
  adjustBalance = async (req: Request, res: Response) => {
    const { amount, description } = req.body
    if (!amount || !description) {
      return ApiResponse.error(res, 'Amount and description are required', HttpStatus.BAD_REQUEST)
    }
    const ok = await this._service.adjustUserBalance(req.params.userId, amount, description)
    return ApiResponse.success(res, { ok })
  }

  /**
   * @desc    Approve a pending payout
   * @route   POST /api/admin/payouts/:id/approve
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  approvePayout = async (req: Request, res: Response) => {
    const ok = await this._service.approvePayout(req.params.id)
    if (!ok) return ApiResponse.error(res, "Payout not found or not pending", HttpStatus.BAD_REQUEST)
    return ApiResponse.success(res, { ok })
  }

  /**
   * @desc    Reject a pending payout
   * @route   POST /api/admin/payouts/:id/reject
   * @req     params: { id }, body: { reason }
   * @res     { ok: boolean }
   */
  rejectPayout = async (req: Request, res: Response) => {
    const { reason } = req.body
    const ok = await this._service.rejectPayout(req.params.id, reason)
    if (!ok) return ApiResponse.error(res, "Payout not found or not pending", HttpStatus.BAD_REQUEST)
    return ApiResponse.success(res, { ok })
  }
}

