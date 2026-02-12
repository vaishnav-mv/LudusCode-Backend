import { singleton, inject } from 'tsyringe'
import { IUserRepository, IProblemRepository, IDuelRepository, IGroupRepository } from '../interfaces/repositories'
import { IAdminService } from '../interfaces/services'
import { DuelStatus, ProblemStatus, User } from '../types'
import { SubscriptionPlanModel } from '../models/SubscriptionPlan'
import { SubscriptionLogModel } from '../models/SubscriptionLog'

@singleton()
export class AdminService implements IAdminService {
  constructor(
    @inject("IUserRepository") private _users: IUserRepository,
    @inject("IProblemRepository") private _problems: IProblemRepository,
    @inject("IDuelRepository") private _duels: IDuelRepository,
    @inject("IGroupRepository") private _groups: IGroupRepository
  ) { }

  async dashboardStats() {
    const allUsers = await this._users.all()
    const allDuels = await this._duels.all()
    const activeDuels = allDuels.filter(duel => duel.status === DuelStatus.InProgress).length
    const totalRevenue = allDuels.reduce((acc, duel) => {
      if (duel.status === DuelStatus.Finished && duel.wager && duel.wager > 0 && duel.winner) {
        const pool = duel.wager * 2
        // Check if winner is populated User object
        const winner = typeof duel.winner === 'object' && duel.winner && 'isPremium' in duel.winner ? duel.winner as User : null;
        if (winner) {
          const rate = winner.isPremium ? 0.05 : 0.1
          return acc + pool * rate
        }
      }
      return acc
    }, 0)
    return { totalUsers: allUsers.length, activeDuels, totalProblems: (await this._problems.all()).length, totalRevenue }
  }

  async financials() {
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

          const problemTitle = typeof duel.problem === 'object' && duel.problem && 'title' in duel.problem ? (duel.problem as any).title : 'Unknown';

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

    return {
      totalRevenue: totalCommissions,
      totalWagered,
      totalCommissions,
      totalDuelsWithWagers: allDuels.filter(duel => duel.wager && duel.wager > 0).length,
      commissionsByDay,
      recentCommissions: recent.sort((a, b) => b.timestamp - a.timestamp)
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

    return {
      users: users,
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
      const ownedGroups = allGroups.filter((group: any) => (group.owner?._id?.toString?.() || group.owner?.toString?.()) === id)
      for (const group of ownedGroups) {
        // Members have already been updated by loop above (user removed)

        const remainingMembers = group.members as any[]
        if (remainingMembers.length > 0) {
          const newOwner = remainingMembers[0]
          const newOwnerId = newOwner._id?.toString?.() || newOwner.toString()

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

  async flaggedActivities() {
    const duels = await this._duels.all()
    const flags = new Map<string, { count: number; paste: number; visibility: number; last: number }>()
    for (const duel of duels) {
      const submissions = (duel as any).submissions || []
      if (submissions.length >= 2) {
        const submission1 = submissions[0]
        const submission2 = submissions[1]
        const close = Math.abs((submission1.submittedAt || 0) - (submission2.submittedAt || 0)) <= 120000
        const copied = submission1.codeHash && submission2.codeHash && submission1.codeHash === submission2.codeHash
        if (copied && close) {
          const uids = [(submission1.userId || submission1.user?._id?.toString?.()), (submission2.userId || submission2.user?._id?.toString?.())].filter(Boolean) as string[]
          for (const uid of uids) {
            const prev = flags.get(uid) || { count: 0, paste: 0, visibility: 0, last: 0 }
            const last = Math.max(prev.last, (submission1.submittedAt || 0), (submission2.submittedAt || 0))
            flags.set(uid, { count: prev.count + 1, paste: prev.paste + 1, visibility: prev.visibility, last })
          }
        }
      }
    }
    const out: { _id?: string, user: User, totalWarnings: number, lastOffense: string, breakdown: { paste: number, visibility: number } }[] = []
    for (const [uid, flagData] of flags.entries()) {
      const user = await this._users.getById(uid)
      if (user) out.push({ user: user, totalWarnings: flagData.count, lastOffense: new Date(flagData.last || Date.now()).toISOString(), breakdown: { paste: flagData.paste, visibility: flagData.visibility } })
    }
    return out
  }

  async clearFlags(userId: string) {
    return true
  }

  async monitoredDuels() {
    const allDuels = await this._duels.all()
    const active = allDuels.filter(duel => duel.status === DuelStatus.InProgress)
    return active.sort((a, b) => b.startTime - a.startTime)
  }

  async cancelDuel(id: string) {
    return true
  }

  async forceDuelResult(id: string, winnerId: string) {
    return true
  }

  async subscriptionData() {
    const plans = await SubscriptionPlanModel.find().lean()
    const logs = await SubscriptionLogModel.find().populate('userId', 'username avatarUrl').populate('planId', 'name period').sort({ timestamp: -1 }).limit(100).lean()

    // Transform logs to match frontend expectations
    const formattedLogs = logs.map((log: any) => {
      let expiry = log.expiryDate;
      if (!expiry && log.planId && log.planId.period) {
        const start = new Date(log.timestamp);
        if (log.planId.period === 'monthly') start.setMonth(start.getMonth() + 1);
        else if (log.planId.period === 'yearly') start.setFullYear(start.getFullYear() + 1);
        expiry = start;
      }

      return {
        id: log._id.toString(),
        user: {
          name: log.userId?.username || 'Unknown',
          avatarUrl: log.userId?.avatarUrl || 'https://via.placeholder.com/150'
        },
        plan: { name: log.planId?.name || 'Unknown Plan' },
        action: log.action,
        timestamp: log.timestamp,
        amount: log.amount,
        expiryDate: expiry
      }
    })

    const formattedPlans = plans.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      period: p.period,
      features: p.features
    }))

    return { plans: formattedPlans, logs: formattedLogs }
  }

  async createPlan(data: any) {
    const plan = await SubscriptionPlanModel.create(data)
    return { ...plan.toObject(), id: plan._id.toString() }
  }

  async updatePlan(id: string, data: any) {
    const plan = await SubscriptionPlanModel.findByIdAndUpdate(id, data, { new: true })
    if (!plan) return null;
    return { ...plan.toObject(), id: plan._id.toString() }
  }

  async deletePlan(id: string) {
    await SubscriptionPlanModel.findByIdAndDelete(id)
    return true
  }

  async grantSubscription(username: string, planId: string) {
    const user = await this._users.getByUsername(username)
    const plan = await SubscriptionPlanModel.findById(planId)
    if (!user || !plan) return false
    const userId = user._id!.toString()

    const now = new Date();
    let expiry = new Date(now);
    let action = 'Grant';

    // Check current state
    if (user.isPremium && user.currentPlanId) {
      if (user.currentPlanId.toString() === plan._id.toString()) {
        // Same Plan
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now) {
          // Active -> Extend
          expiry = new Date(user.subscriptionExpiry);
          action = 'Renewed'; // Or "Extended"
        } else {
          // Expired -> New Start (Resubscribe)
          action = 'Subscribed';
        }
      } else {
        // Different Plan -> Check for Upgrade vs Downgrade (Price check)
        const oldPlan = await SubscriptionPlanModel.findById(user.currentPlanId);
        if (oldPlan && oldPlan.price > plan.price) {
          action = 'Downgraded';
        } else {
          action = 'Upgraded';
        }
        // Logic: Overwrite expiry to now + new duration (Partial refund or carry-over logic not implemented, simplified to 'New Term Starts Now')
      }
    } else {
      // New Subscription
      action = 'Subscribed';
    }

    // specific check: if action is 'Grant' (fallback) but user had no previous plan, it matches 'Subscribed'
    if (action === 'Grant' && !user.isPremium) action = 'Subscribed';


    // Calculate Duration to add
    if (plan.period === 'monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan.period === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    await this._users.update(userId, {
      isPremium: true,
      currentPlanId: plan._id.toString(),
      subscriptionExpiry: expiry
    })

    await SubscriptionLogModel.create({
      userId,
      planId,
      action: action,
      amount: plan.price,
      expiryDate: expiry
    })
    return true
  }

  async cancelSubscription(userId: string) {
    const user = await this._users.getById(userId)
    if (!user) return false

    await this._users.update(userId, {
      isPremium: false,
      currentPlanId: undefined, // Mongoose update will unset or set to null if schema allows, or use $unset
      subscriptionExpiry: undefined
    })

    await SubscriptionLogModel.create({
      userId,
      action: 'Revoke',
      amount: 0
    })
    return true
  }
}
