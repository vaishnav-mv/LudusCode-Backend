import { singleton, inject } from 'tsyringe'
import { IUserRepository, IProblemRepository, IDuelRepository, IGroupRepository, IWalletRepository, ISubscriptionRepository } from '../interfaces/repositories'
import { broadcastDuel } from '../realtime/ws'
import { mapDuel, mapProblem, mapSubscriptionPlan, mapSubscriptionLog, mapTransaction, mapUser } from '../utils/mapper'
import { IAdminService } from '../interfaces/services'
import { DuelStatus, ProblemStatus, SubscriptionPlan, TransactionType, User, SubscriptionAction } from '../types'
import { UserResponseDTO } from '../dto/response/user.response.dto'
import { ProblemResponseDTO } from '../dto/response/problem.response.dto'
import { SubscriptionPlanResponseDTO, SubscriptionLogResponseDTO } from '../dto/response/subscription.response.dto'
import { TransactionResponseDTO } from '../dto/response/transaction.response.dto'
import { DuelResponseDTO } from '../dto/response/duel.response.dto'
import { computeSubscriptionAction } from '../utils/subscriptionHelper'
import { IAiProvider } from '../interfaces/providers'

@singleton()
export class AdminService implements IAdminService {
  constructor(
    @inject("IUserRepository") private _users: IUserRepository,
    @inject("IProblemRepository") private _problems: IProblemRepository,
    @inject("IDuelRepository") private _duels: IDuelRepository,
    @inject("IGroupRepository") private _groups: IGroupRepository,
    @inject("IWalletRepository") private _wallets: IWalletRepository,
    @inject("ISubscriptionRepository") private _subscriptions: ISubscriptionRepository,
    @inject("IAiProvider") private _aiProvider: IAiProvider
  ) { }

  async dashboardStats(options?: { startDate?: Date, endDate?: Date }) {
    const userMatch: any = { isAdmin: { $ne: true } };
    const duelMatch: any = { status: DuelStatus.InProgress };
    const problemMatch: any = {};
    if (options?.startDate || options?.endDate) {
      const dateFilter: any = {};
      const numFilter: any = {};
      if (options.startDate) {
        dateFilter.$gte = options.startDate;
        numFilter.$gte = options.startDate.getTime();
      }
      if (options.endDate) {
        dateFilter.$lte = options.endDate;
        numFilter.$lte = options.endDate.getTime();
      }
      userMatch.createdAt = dateFilter;
      duelMatch.startTime = numFilter;
      problemMatch.createdAt = dateFilter;
    }

    const [
      totalUsers,
      activeDuels,
      totalProblems,
      subscriptionRevenue,
      commissionStats,
      pendingProblems,
      pendingPayoutsResponse,
      flaggedActivitiesResponse
    ] = await Promise.all([
      this._users.count(userMatch),
      this._duels.count(duelMatch),
      this._problems.count(problemMatch),
      this._subscriptions.getTotalSubscriptionRevenue(options?.startDate, options?.endDate),
      this._duels.getCommissionStats(options?.startDate, options?.endDate),
      this._problems.count({ ...problemMatch, status: ProblemStatus.Pending }),
      this._wallets.getAllTransactions(0, 1, { status: 'Pending', type: TransactionType.Withdrawal }),
      this._duels.getFlaggedActivities(1, 1)
    ])

    const duelRevenue = commissionStats.totalCommissions || 0
    const pendingPayouts = pendingPayoutsResponse.total
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

  async financials(page: number = 1, limit: number = 50, filterType: string = 'all', options?: { query?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', startDate?: Date, endDate?: Date, groupBy?: 'day' | 'month' | 'year' }) {
    const [
      commissionStats,
      commissionsByDay,
      subscriptionRevenue,
      subscriptionsByDay
    ] = await Promise.all([
      this._duels.getCommissionStats(options?.startDate, options?.endDate),
      this._duels.getCommissionsByDay(options?.startDate, options?.endDate, options?.groupBy),
      this._subscriptions.getTotalSubscriptionRevenue(options?.startDate, options?.endDate),
      this._subscriptions.getRevenueByDay(options?.startDate, options?.endDate, options?.groupBy)
    ])

    let recentTransactions: any[] = []
    let totalTransactions = 0
    const skip = (page - 1) * limit

    if (filterType === 'commissions') {
      const { recent, total } = await this._duels.getRecentCommissions(page, limit, options)
      recentTransactions = recent.map(commission => ({
        id: commission.duelId,
        title: 'Duel: ' + commission.problemTitle,
        user: commission.winnerName,
        wager: commission.wager,
        amount: commission.commission,
        timestamp: commission.timestamp,
        type: 'commission'
      }))
      totalTransactions = total
    } else if (filterType === 'subscriptions') {
      const { logs, total } = await this._subscriptions.getLogsAll(skip, limit, { ...options, isRevenue: true })
      recentTransactions = logs.map(log => ({
        id: log.id,
        title: (log.plan?.name || 'Unknown Plan') + ' ' + log.action,
        user: log.user?.username || 'Unknown User',
        wager: null,
        amount: log.amount,
        timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp).getTime() : new Date(log.timestamp as Date).getTime(),
        type: 'subscription'
      }))
      totalTransactions = total
    } else { // 'all'
      const fetchLimit = (options?.query || options?.sortStr) ? 5000 : page * limit
      const [commissionsData, subsData] = await Promise.all([
        this._duels.getRecentCommissions(1, fetchLimit, options),
        this._subscriptions.getLogsAll(0, fetchLimit, { ...options, isRevenue: true })
      ])
      
      const comms = commissionsData.recent.map(commission => ({
        id: commission.duelId,
        title: 'Duel: ' + commission.problemTitle,
        user: commission.winnerName,
        wager: commission.wager,
        amount: commission.commission,
        timestamp: commission.timestamp,
        type: 'commission'
      }))
      const subs = subsData.logs.map(log => ({
        id: log.id,
        title: (log.plan?.name || 'Unknown Plan') + ' ' + log.action,
        user: log.user?.username || 'Unknown User',
        wager: null,
        amount: log.amount,
        timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp).getTime() : new Date(log.timestamp as Date).getTime(),
        type: 'subscription'
      }))
      
      const combined = [...comms, ...subs];
      if (options?.sortStr === 'amount') {
          combined.sort((a, b) => options.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount);
      } else {
          combined.sort((a, b) => options?.sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
      }
      
      recentTransactions = combined.slice(skip, skip + limit)
      totalTransactions = commissionsData.total + subsData.total
    }

    return {
      totalDuelWagered: commissionStats.totalWagered,
      totalDuelCommissions: commissionStats.totalCommissions,
      totalDuelsWithWagers: commissionStats.totalDuelsWithWagers,
      totalSubscriptionRevenue: subscriptionRevenue,
      totalPlatformRevenue: commissionStats.totalCommissions + subscriptionRevenue,
      commissionsByDay,
      subscriptionsByDay,
      recentTransactions,
      total: totalTransactions,
      page,
      totalPages: Math.ceil(totalTransactions / limit) || 1
    }
  }

  async pendingProblems(page: number = 1, limit: number = 50): Promise<{ problems: ProblemResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit;
    const filter = { status: ProblemStatus.Pending };

    const [problems, total] = await Promise.all([
      this._problems.all(skip, limit, filter),
      this._problems.count(filter)
    ]);

    return {
      problems: problems.map(problem => mapProblem(problem)).filter((problem): problem is ProblemResponseDTO => problem !== null),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
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

  async validateProblemTests(id: string): Promise<any> {
    const problem = await this._problems.getById(id)
    if (!problem) throw new Error("Problem not found")

    // We expect the problem to have at least one solution to test against
    if (!problem.solutions || problem.solutions.length === 0) {
      throw new Error("No solution provided to validate against.")
    }

    // Default to the first solution, or JS if possible
    const solution = problem.solutions.find((s: any) => s.language.toLowerCase() === 'javascript') || problem.solutions[0];

    // Call the edge case AI method which returns a JSON analysis of flaws/edge cases
    const analysisStr = await this._aiProvider.validateTestCases(problem, solution.code);
    return JSON.parse(analysisStr);
  }

  async addProblemTestCases(id: string, newTestCases: any[]): Promise<boolean> {
    const problem = await this._problems.getById(id);
    if (!problem) return false;

    // Append new test cases to existing ones
    const updatedTestCases = [...(problem.testCases || []), ...newTestCases];

    await this._problems.update(id, { testCases: updatedTestCases });
    return true;
  }

  async allProblems(page: number = 1, limit: number = 50): Promise<{ problems: ProblemResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit
    const [problems, total] = await Promise.all([
      this._problems.all(skip, limit),
      this._problems.count()
    ])
    return {
      problems: problems.map(problem => mapProblem(problem)).filter((problem): problem is ProblemResponseDTO => problem !== null),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async allUsers(page: number = 1, limit: number = 5, query?: string): Promise<{ users: UserResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = { isAdmin: { $ne: true } }

    if (query) {
      const regex = new RegExp(query, 'i')
      filter.$or = [
        { username: regex },
        { email: regex }
      ]
    }

    const [users, total] = await Promise.all([
      this._users.all(skip, limit, filter),
      this._users.count(filter)
    ])

    // Compute leaderboard rank for each user
    const usersWithRank = await Promise.all(
      users.map(async (user) => {
        const rank = await this._users.getRank(user.elo ?? 0)
        return { ...user, leaderboardRank: rank }
      })
    )

    return {
      users: usersWithRank.map(user => mapUser(user)).filter((user): user is UserResponseDTO => user !== null),
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

  async searchUsers(query: string): Promise<UserResponseDTO[]> {
    const users = await this._users.search(query);
    return users.map(user => mapUser(user)).filter((user): user is UserResponseDTO => user !== null);
  }

  async flaggedActivities(page: number = 1, limit: number = 50): Promise<{ data: { user: UserResponseDTO; totalWarnings: number; lastOffense: string; breakdown: { paste: number; visibility: number; }; }[]; total: number; page: number; totalPages: number; }> {
    const { data, total } = await this._duels.getFlaggedActivities(page, limit)

    return {
      data: data.map(flagged => ({
        ...flagged,
        user: mapUser(flagged.user as User)!
      })) as { _id?: string; user: UserResponseDTO; totalWarnings: number; lastOffense: string; breakdown: { paste: number; visibility: number } }[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async monitoredDuels(page: number = 1, limit: number = 50): Promise<{ duels: DuelResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit
    const [recentDuels, total] = await Promise.all([
      this._duels.all(skip, limit),
      this._duels.count()
    ])
    return {
      duels: recentDuels.map(duel => mapDuel(duel)).filter((duel): duel is DuelResponseDTO => duel !== null),
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

  async subscriptionData(page: number = 1, limit: number = 50, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', query?: string }): Promise<{ plans: SubscriptionPlanResponseDTO[], logs: SubscriptionLogResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit
    const [plansInfo, { logs, total }] = await Promise.all([
      this._subscriptions.getAllPlansAdmin(),
      this._subscriptions.getLogsAll(skip, limit, options)
    ])

    return {
      plans: plansInfo.map(plan => mapSubscriptionPlan(plan)).filter((plan): plan is SubscriptionPlanResponseDTO => plan !== null),
      logs: logs as any,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlanResponseDTO> {
    const created = await this._subscriptions.createPlan(data)
    return mapSubscriptionPlan(created)!
  }

  async updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlanResponseDTO | null> {
    const updated = await this._subscriptions.updatePlan(id, data)
    return updated ? mapSubscriptionPlan(updated) : null
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
      action: action === SubscriptionAction.Subscribed ? SubscriptionAction.Grant : action,
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
      action: SubscriptionAction.Revoke,
      amount: 0
    })
    return true
  }

  async getUserWallet(userId: string) {
    const wallet = await this._wallets.get(userId)
    return { balance: wallet.balance, currency: wallet.currency }
  }

  async getAllTransactions(page: number = 1, limit: number = 50, options?: { status?: string, type?: string, sort?: string, query?: string }): Promise<{ transactions: TransactionResponseDTO[], total: number, page: number, totalPages: number }> {
    const skip = (page - 1) * limit
    const { transactions, total } = await this._wallets.getAllTransactions(skip, limit, options)
    return {
      transactions: transactions.map(transaction => mapTransaction(transaction)).filter((transaction): transaction is TransactionResponseDTO => transaction !== null),
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

      const uId = tx.userId as { _id?: { toString(): string }; id?: string } | string;
      const userIdStr = typeof uId === 'string' ? uId : uId?._id?.toString() || uId?.id
      if (userIdStr) {
        await this._wallets.deposit(userIdStr as string, refundAmount, description)
      }
    }
    return updated
  }
}
