
import { singleton, inject } from 'tsyringe'
import { IUserRepository, IProblemRepository, IDuelRepository, IGroupRepository, IWalletRepository, ISubscriptionRepository } from '../interfaces/repositories'
import { broadcastDuel } from '../realtime/ws'
import { mapDuel } from '../utils/mapper'
import { IAdminService } from '../interfaces/services'
import { DuelStatus, ProblemStatus, User, SubscriptionPlan, Problem, DuelPlayer } from '../types'
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
    const allDuels = await this._duels.all()
    const duelRevenue = allDuels.reduce((acc, duel) => {
      if (duel.status === DuelStatus.Finished && duel.wager && duel.wager > 0 && duel.winner) {
        const pool = duel.wager * 2
        const winner = typeof duel.winner === 'object' && duel.winner && 'isPremium' in duel.winner ? duel.winner as User : null;
        if (winner) {
          const rate = winner.isPremium ? 0.05 : 0.1
          return acc + pool * rate
        }
      }
      return acc
    }, 0)

    return { totalUsers, activeDuels, totalProblems, totalRevenue: duelRevenue + subscriptionRevenue }
  }

  // Gap 11: Use MongoDB aggregation pipeline for duel commissions instead of in-memory loop
  async financials(page: number = 1, limit: number = 50) {
    const allDuels = await this._duels.all()

    interface FinancialRecord {
      duelId: string;
      problemTitle: string;
      winnerName: string;
      wager: number;
      commission: number;
      timestamp: number;
    }

    const recent: FinancialRecord[] = []
    let totalWagered = 0
    let totalCommissions = 0
    const map = new Map<string, number>()

    for (const duel of allDuels) {
      if (duel.status === DuelStatus.Finished && duel.wager && duel.wager > 0 && duel.winner) {
        totalWagered += duel.wager * 2
        const pool = duel.wager * 2
        const winner = typeof duel.winner === 'object' && duel.winner && 'username' in duel.winner ? duel.winner as User : null;

        if (winner) {
          const rate = winner.isPremium ? 0.05 : 0.1
          const commission = pool * rate
          totalCommissions += commission

          const problem = typeof duel.problem === 'object' && duel.problem ? duel.problem as Problem : null;
          const problemTitle = problem ? problem.title : 'Unknown';

          recent.push({
            duelId: duel.id || duel._id?.toString() || '',
            problemTitle: problemTitle,
            winnerName: winner.username || 'Unknown',
            wager: duel.wager,
            commission,
            timestamp: typeof duel.startTime === 'number' ? duel.startTime : new Date(duel.startTime).getTime()
          })
          const date = new Date(duel.startTime || Date.now()).toISOString().split('T')[0]
          map.set(date, (map.get(date) || 0) + commission)
        }
      }
    }

    const commissionsByDay = Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Memory Pagination
    const sortedRecent = recent.sort((a, b) => b.timestamp - a.timestamp)
    const total = sortedRecent.length
    const skip = (page - 1) * limit
    const paginatedRecent = sortedRecent.slice(skip, skip + limit)

    // Gap 3 + 15: Include subscription revenue in financials
    const subscriptionRevenue = await this._subscriptions.getTotalSubscriptionRevenue()

    return {
      totalRevenue: totalCommissions,
      totalWagered,
      totalCommissions,
      totalDuelsWithWagers: allDuels.filter(duel => duel.wager && duel.wager > 0).length,
      subscriptionRevenue,
      totalPlatformRevenue: totalCommissions + subscriptionRevenue,
      commissionsByDay,
      recentCommissions: paginatedRecent,
      total,
      page,
      totalPages: Math.ceil(total / limit)
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
      // Remove from all groups
      const allGroups = await this._groups.all()
      for (const group of allGroups) {
        const memberIndex = (group.members || []).findIndex(member => {
          if (typeof member === 'string') return member === id;
          return member._id?.toString() === id || member.id === id;
        });
        const pendingIndex = (group.pendingMembers || []).findIndex(member => {
          if (typeof member === 'string') return member === id;
          return member._id?.toString() === id || member.id === id;
        });

        let changed = false
        if (memberIndex !== -1) {
          group.members.splice(memberIndex, 1)
          changed = true
        }
        if (pendingIndex !== -1) {
          (group.pendingMembers || []).splice(pendingIndex, 1)
          changed = true
        }

        if (changed) {
          const members = group.members.map(member => typeof member === 'string' ? member : member._id?.toString() || member.id!).filter(Boolean)
          const pendingMembers = (group.pendingMembers || []).map(member => typeof member === 'string' ? member : member._id?.toString() || member.id!).filter(Boolean)
          await this._groups.update(group._id as string, { members, pendingMembers })
        }
      }

      // Handle ownership transfer or group deletion for groups owned by banned user
      const ownedGroups = allGroups.filter(group => {
        const ownerId = typeof group.owner === 'string' ? group.owner : group.owner._id?.toString() || group.owner.id;
        return ownerId === id;
      })
      for (const group of ownedGroups) {
        const remainingMembers = group.members
        if (remainingMembers.length > 0) {
          const newOwner = remainingMembers[0]
          const newOwnerId = typeof newOwner === 'string' ? newOwner : newOwner._id?.toString() || newOwner.id

          await this._groups.update(group._id as string, { owner: newOwnerId })
        } else {
          await this._groups.delete(group._id as string)
        }
      }
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
    const duels = await this._duels.all()
    const flags = new Map<string, { count: number; paste: number; visibility: number; last: number }>()
    for (const duel of duels) {
      const submissions = duel.submissions || []
      if (submissions.length >= 2) {
        const submission1 = submissions[0]
        const submission2 = submissions[1]
        const close = Math.abs((submission1.submittedAt || 0) - (submission2.submittedAt || 0)) <= 120000
        const copied = submission1.codeHash && submission2.codeHash && submission1.codeHash === submission2.codeHash
        if (copied && close) {
          const u1 = submission1.user;
          const u2 = submission2.user;
          const uid1 = typeof u1 === 'string' ? u1 : u1?._id?.toString() || u1?.id;
          const uid2 = typeof u2 === 'string' ? u2 : u2?._id?.toString() || u2?.id;
          const uids = [uid1, uid2].filter(Boolean) as string[]
          for (const uid of uids) {
            const prev = flags.get(uid) || { count: 0, paste: 0, visibility: 0, last: 0 }
            const last = Math.max(prev.last, (submission1.submittedAt || 0), (submission2.submittedAt || 0))
            flags.set(uid, { count: prev.count + 1, paste: prev.paste + 1, visibility: prev.visibility, last })
          }
        }
      }

      // Check DB warnings (Real-time enforcement)
      const checkPlayer = (player: DuelPlayer) => {
        if (player.user && player.warnings > 0) {
          const uid = typeof player.user === 'string' ? player.user : player.user.id || player.user._id?.toString();
          if (uid) {
            const prev = flags.get(uid) || { count: 0, paste: 0, visibility: 0, last: 0 }
            const duelTime = new Date(duel.updatedAt || duel.startTime || Date.now()).getTime();
            const last = Math.max(prev.last, duelTime)

            const breakdown = player.warningsBreakdown || { paste: 0, visibility: 0 }

            flags.set(uid, {
              count: prev.count + player.warnings,
              paste: prev.paste + (breakdown.paste || 0),
              visibility: prev.visibility + (breakdown.visibility || 0),
              last
            })
          }
        }
      }
      checkPlayer(duel.player1);
      checkPlayer(duel.player2);
    }
    const out: { _id?: string, user: User, totalWarnings: number, lastOffense: string, breakdown: { paste: number, visibility: number } }[] = []
    for (const [uid, flagData] of flags.entries()) {
      const user = await this._users.getById(uid)
      if (user) out.push({ user: user, totalWarnings: flagData.count, lastOffense: new Date(flagData.last || Date.now()).toISOString(), breakdown: { paste: flagData.paste, visibility: flagData.visibility } })
    }

    // Memory Pagination
    const total = out.length
    const skip = (page - 1) * limit
    const paginatedOut = out.slice(skip, skip + limit)

    return {
      data: paginatedOut,
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

  async subscriptionData(page: number = 1, limit: number = 50) {
    const plans = await this._subscriptions.getPlans()
    const { logs, total } = await this._subscriptions.getLogsAll((page - 1) * limit, limit)

    const formattedPlans = plans.map((plan) => ({
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

  async getAllTransactions(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit
    const { transactions, total } = await this._wallets.getAllTransactions(skip, limit)
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
}
