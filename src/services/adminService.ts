
import { singleton, inject } from 'tsyringe'
import { IUserRepository, IProblemRepository, IDuelRepository, IGroupRepository, IWalletRepository, ISubscriptionRepository } from '../interfaces/repositories'
import { broadcastDuel } from '../realtime/ws'
import { mapDuel } from '../utils/mapper'
import { IAdminService } from '../interfaces/services'
import { DuelStatus, ProblemStatus, User, SubscriptionPlan, Problem, DuelPlayer, TransactionType } from '../types'
import { computeSubscriptionAction } from './subscriptionService'

@singleton()
export class AdminService implements IAdminService {
  constructor(
    @inject("IUserRepository") private _users: IUserRepository,
    @inject("IProblemRepository") private _problems: IProblemRepository,
    @inject("IDuelRepository") private _duels: IDuelRepository,
    @inject("IGroupRepository") private _groups: IGroupRepository,
    @inject("IWalletRepository") private _wallets: IWalletRepository,
    @inject("ISubscriptionRepository") private _subscriptions: ISubscriptionRepository
  ) { }

  async dashboardStats() {
    const totalUsers = await this._users.count()
    const activeDuels = await this._duels.count({ status: DuelStatus.InProgress })
    const totalProblems = await this._problems.count()

    // Use aggregation for total revenue (duel commissions + subscription revenue)
    const subscriptionRevenue = await this._subscriptions.getTotalSubscriptionRevenue()
    const commissionStats = await this._duels.getCommissionStats()
    const duelRevenue = commissionStats.totalCommissions || 0

    const pendingProblems = await this._problems.count({ status: ProblemStatus.Pending })
    const pendingPayoutsResponse = await this._wallets.getAllTransactions(0, 1, { status: 'Pending', type: TransactionType.Withdrawal })
    const pendingPayouts = pendingPayoutsResponse.total
    const flaggedActivitiesResponse = await this._duels.getFlaggedActivities(1, 1)
    const pendingAntiCheat = flaggedActivitiesResponse.total

    return {
      totalUsers,
      activeDuels,
      totalProblems,
      totalRevenue: duelRevenue + subscriptionRevenue,
      pendingProblems,
      pendingPayouts,
      pendingAntiCheat
    }
  }

  // Gap 11: Fixed - Used MongoDB aggregation pipeline for duel commissions
  async financials(page: number = 1, limit: number = 50) {
    const commissionStats = await this._duels.getCommissionStats()
    const commissionsByDay = await this._duels.getCommissionsByDay()
    const recentPagination = await this._duels.getRecentCommissions(page, limit)

    // Gap 3 + 15: Include subscription revenue in financials
    const subscriptionRevenue = await this._subscriptions.getTotalSubscriptionRevenue()

    return {
      totalDuelWagered: commissionStats.totalWagered,
      totalDuelCommissions: commissionStats.totalCommissions,
      totalDuelsWithWagers: commissionStats.totalDuelsWithWagers,
      totalSubscriptionRevenue: subscriptionRevenue,
      totalPlatformRevenue: commissionStats.totalCommissions + subscriptionRevenue,
      commissionsByDay,
      recentCommissions: recentPagination.recent,
      total: recentPagination.total,
      page,
      totalPages: Math.ceil(recentPagination.total / limit)
    }
  }

  async pendingProblems() {
    return this._problems.pending()
  }

  async approveProblem(id: string) {
    const problem = await this._problems.getById(id)
    if (!problem) return false
    await this._problems.update(id, { status: ProblemStatus.Approved })
    return true
  }

  async rejectProblem(id: string) {
    const problem = await this._problems.getById(id)
    if (!problem) return false
    await this._problems.delete(id)
    return true
  }

  async allProblems(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit
    const problems = await this._problems.all(skip, limit)
    const total = await this._problems.count()
    return {
      problems,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async allUsers(page: number = 1, limit: number = 5, query?: string) {
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = { isAdmin: { $ne: true } }

    if (query) {
      const regex = new RegExp(query, 'i')
      filter.$or = [
        { username: regex },
        { email: regex }
      ]
    }

    const users = await this._users.all(skip, limit, filter)
    const total = await this._users.count(filter)

    // Compute leaderboard rank for each user
    const usersWithRank = await Promise.all(
      users.map(async (user) => {
        const rank = await this._users.getRank(user.elo ?? 0)
        return { ...user, leaderboardRank: rank }
      })
    )

    return {
      users: usersWithRank,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async banUser(id: string) {
    const user = await this._users.update(id, { isBanned: true })
    if (user) {
      await this._groups.removeMemberFromAll(id)
      await this._groups.transferOrDeleteOwnedGroups(id)
    }
    return !!user
  }

  async unbanUser(id: string) {
    const user = await this._users.update(id, { isBanned: false })
    return !!user
  }

  async searchUsers(query: string) {
    return this._users.search(query);
  }

  async flaggedActivities(page: number = 1, limit: number = 50) {
    const { data, total } = await this._duels.getFlaggedActivities(page, limit)

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async monitoredDuels(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit
    const recentDuels = await this._duels.all(skip, limit)
    const total = await this._duels.count()
    return {
      duels: recentDuels,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async cancelDuel(id: string) {
    const duel = await this._duels.getById(id)
    if (!duel) return false
    const wager = duel.wager || 0
    if (wager > 0) {
      const p1 = duel.player1.user;
      const p2 = duel.player2.user;
      const player1Id = typeof p1 === 'string' ? p1 : p1?._id?.toString() || p1?.id;
      const player2Id = typeof p2 === 'string' ? p2 : p2?._id?.toString() || p2?.id;
      if (player1Id) await this._wallets.add(player1Id, wager, 'Duel cancel refund')
      if (player2Id) await this._wallets.add(player2Id, wager, 'Duel cancel refund')
    }
    await this._duels.update(id, { status: DuelStatus.Cancelled, winner: null })
    const updatedDuel = await this._duels.getById(id)
    if (updatedDuel) {
      const dto = mapDuel(updatedDuel);
      if (dto) broadcastDuel(id, dto)
    }
    return true
  }

  async subscriptionData(page: number = 1, limit: number = 50, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', query?: string }) {
    const plansInfo = await this._subscriptions.getPlans()

    const skip = (page - 1) * limit
    const { logs, total } = await this._subscriptions.getLogsAll(skip, limit, options)

    const formattedPlans = plansInfo.map((plan) => ({
      id: (plan._id || plan.id || '').toString(),
      name: plan.name,
      price: plan.price,
      period: plan.period,
      maxDailyDuels: plan.maxDailyDuels,
      features: plan.features
    }))

    return {
      plans: formattedPlans,
      logs: logs as unknown as { id: string, user: { name: string, avatarUrl: string }, plan: { name: string }, action: string, timestamp: Date | string, amount: number, expiryDate?: Date | string }[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return this._subscriptions.createPlan(data)
  }

  async updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
    return this._subscriptions.updatePlan(id, data)
  }

  async deletePlan(id: string) {
    return this._subscriptions.deletePlan(id)
  }

  async grantSubscription(username: string, planId: string) {
    const user = await this._users.getByUsername(username)
    const plan = await this._subscriptions.getPlanById(planId)
    if (!user || !plan) return false
    const userId = user._id!.toString()

    let oldPlan = null
    if (user.currentPlanId && user.currentPlanId.toString() !== (plan._id || plan.id || '').toString()) {
      oldPlan = await this._subscriptions.getPlanById(user.currentPlanId.toString())
    }

    const { action, newExpiry } = computeSubscriptionAction(user, plan, oldPlan)

    await this._users.update(userId, {
      isPremium: true,
      currentPlanId: (plan._id || plan.id || '').toString(),
      subscriptionExpiry: newExpiry
    })

    await this._subscriptions.createLog({
      userId,
      planId: (plan._id || plan.id || '').toString(),
      action: action === 'Subscribed' ? 'Grant' : action,
      amount: plan.price,
      expiryDate: newExpiry
    })
    return true
  }

  async cancelSubscription(userId: string) {
    const user = await this._users.getById(userId)
    if (!user) return false

    const planId = user.currentPlanId

    await this._users.update(userId, {
      isPremium: false,
      currentPlanId: undefined,
      subscriptionExpiry: undefined
    })

    await this._subscriptions.createLog({
      userId,
      planId: planId?.toString(),
      action: 'Revoke',
      amount: 0
    })
    return true
  }

  // Gap 10: Admin wallet management
  async getUserWallet(userId: string) {
    const wallet = await this._wallets.get(userId)
    return { balance: wallet.balance, currency: wallet.currency }
  }

  async getAllTransactions(page: number = 1, limit: number = 50, options?: { status?: string, type?: string, sort?: string, query?: string }) {
    const skip = (page - 1) * limit
    const { transactions, total } = await this._wallets.getAllTransactions(skip, limit, options)
    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async adjustUserBalance(userId: string, amount: number, description: string) {
    if (amount > 0) {
      await this._wallets.deposit(userId, amount, `Admin Credit: ${description}`)
    } else if (amount < 0) {
      const success = await this._wallets.withdraw(userId, Math.abs(amount), `Admin Debit: ${description}`)
      if (!success) return false
    }
    return true
  }

  async approvePayout(transactionId: string) {
    const tx = await this._wallets.getTransactionById(transactionId)
    if (!tx || tx.type !== TransactionType.Withdrawal || tx.status !== 'Pending') {
      return false
    }
    return this._wallets.updateTransactionStatus(transactionId, 'Completed')
  }

  async rejectPayout(transactionId: string, reason?: string) {
    const tx = await this._wallets.getTransactionById(transactionId)
    if (!tx || tx.type !== TransactionType.Withdrawal || tx.status !== 'Pending') {
      return false
    }

    const updated = await this._wallets.updateTransactionStatus(transactionId, 'Failed')
    if (updated) {
      const refundAmount = Math.abs(tx.amount)
      let description = `Refund: Payout Rejected`
      if (reason) description += ` (${reason})`

      const uId = tx.userId as any;
      const userIdStr = typeof uId === 'string' ? uId : uId?._id?.toString() || uId?.id
      if (userIdStr) {
        await this._wallets.deposit(userIdStr as string, refundAmount, description)
      }
    }
    return updated
  }
}
