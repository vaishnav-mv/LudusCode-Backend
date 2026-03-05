import { singleton } from 'tsyringe'
import { ISubscriptionRepository } from '../interfaces/repositories'
import { SubscriptionPlanModel } from '../models/SubscriptionPlan'
import { SubscriptionLogModel } from '../models/SubscriptionLog'
import { UserModel } from '../models/User'
import { SubscriptionPlan, SubscriptionLog } from '../types'

@singleton()
export class SubscriptionRepository implements ISubscriptionRepository {

    async getPlans(): Promise<SubscriptionPlan[]> {
        const plans = await SubscriptionPlanModel.find().lean()
        return plans.map((plan) => ({
            ...plan,
            id: plan._id.toString(),
            _id: plan._id.toString()
        })) as unknown as SubscriptionPlan[]
    }

    async getPlanById(id: string): Promise<SubscriptionPlan | null> {
        const plan = await SubscriptionPlanModel.findById(id).lean()
        if (!plan) return null
        return { ...plan, id: plan._id.toString(), _id: plan._id.toString() } as unknown as SubscriptionPlan
    }

    async createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
        const plan = await SubscriptionPlanModel.create(data)
        const obj = plan.toObject()
        return { ...obj, id: obj._id.toString() } as unknown as SubscriptionPlan
    }

    async updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
        const plan = await SubscriptionPlanModel.findByIdAndUpdate(id, data, { new: true }).lean()
        if (!plan) return null
        return { ...plan, id: plan._id.toString() } as unknown as SubscriptionPlan
    }

    async deletePlan(id: string): Promise<boolean> {
        const result = await SubscriptionPlanModel.findByIdAndDelete(id)
        return !!result
    }

    async createLog(data: Partial<SubscriptionLog>): Promise<SubscriptionLog> {
        const log = await SubscriptionLogModel.create(data)
        return log.toObject() as unknown as SubscriptionLog
    }

    async getLogsByUser(userId: string, skip: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ logs: SubscriptionLog[], total: number }> {
        const match: Record<string, unknown> = { userId }
        if (options?.action && options.action !== 'All') {
            match.action = options.action
        }

        const sortDir = options?.sortOrder === 'asc' ? 1 : -1
        let sortObj: Record<string, 1 | -1> = { timestamp: -1 } // default

        if (options?.sortStr) {
            if (options.sortStr === 'date') sortObj = { timestamp: sortDir }
            else if (options.sortStr === 'amount') sortObj = { amount: sortDir }
        }

        const total = await SubscriptionLogModel.countDocuments(match)
        const logs = await SubscriptionLogModel.find(match)
            .populate('planId', 'name period price')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean()

        const formattedLogs = logs.map((log) => {
            const logObj = log as Record<string, unknown>
            const planObj = logObj.planId as { name?: string; period?: string; price?: number } | undefined
            return {
                id: (logObj._id as object).toString(),
                plan: { name: planObj?.name || 'Unknown Plan', period: planObj?.period },
                action: logObj.action,
                amount: logObj.amount,
                timestamp: logObj.timestamp,
                expiryDate: logObj.expiryDate
            } as unknown as SubscriptionLog
        })

        return { logs: formattedLogs, total }
    }

    async getLogsAll(skip: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', query?: string }): Promise<{ logs: SubscriptionLog[], total: number }> {
        const match: Record<string, unknown> = {}

        if (options?.action && options.action !== 'All') {
            match.action = options.action
        }

        if (options?.query && options.query.trim() !== '') {
            const userFilter = {
                $or: [
                    { username: { $regex: options.query, $options: 'i' } },
                    { email: { $regex: options.query, $options: 'i' } }
                ]
            }
            const users = await UserModel.find(userFilter).select('_id').lean()
            const userIds = users.map(user => user._id)
            match.userId = { $in: userIds }
        }

        const sortDir = options?.sortOrder === 'asc' ? 1 : -1
        let sortObj: Record<string, 1 | -1> = { timestamp: -1 } // default

        if (options?.sortStr) {
            if (options.sortStr === 'date') sortObj = { timestamp: sortDir }
            else if (options.sortStr === 'amount') sortObj = { amount: sortDir }
        }

        const total = await SubscriptionLogModel.countDocuments(match)
        const logs = await SubscriptionLogModel.find(match)
            .populate('userId', 'username avatarUrl')
            .populate('planId', 'name period')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean()

        interface PopulatedLog {
            _id: object;
            userId?: { username: string; avatarUrl: string };
            planId?: { name: string; period: string };
            action: string;
            timestamp: Date;
            amount: number;
            expiryDate?: Date;
        }

        const formattedLogs = logs.map((log) => {
            const logObj = log as unknown as PopulatedLog
            let expiry = logObj.expiryDate
            if (!expiry && logObj.planId?.period) {
                const start = new Date(logObj.timestamp)
                if (logObj.planId.period === 'monthly') start.setMonth(start.getMonth() + 1)
                else if (logObj.planId.period === 'yearly') start.setFullYear(start.getFullYear() + 1)
                expiry = start
            }

            return {
                id: logObj._id.toString(),
                user: {
                    name: logObj.userId?.username || 'Unknown',
                    avatarUrl: logObj.userId?.avatarUrl || 'https://via.placeholder.com/150'
                },
                plan: { name: logObj.planId?.name || 'Unknown Plan' },
                action: logObj.action,
                timestamp: logObj.timestamp,
                amount: logObj.amount,
                expiryDate: expiry
            } as unknown as SubscriptionLog
        })

        return { logs: formattedLogs, total }
    }

    async getTotalSubscriptionRevenue(): Promise<number> {
        const result = await SubscriptionLogModel.aggregate([
            { $match: { action: { $in: ['Subscribed', 'Renewed', 'Upgraded', 'Grant'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
        return result.length > 0 ? result[0].total : 0
    }
}
