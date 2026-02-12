import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { ISubscriptionService } from '../interfaces/services'

@singleton()
export class SubscriptionController {
    constructor(
        @inject("ISubscriptionService") private _service: ISubscriptionService
    ) { }

    /**
     * @desc    Get all subscription plans
     * @route   GET /api/subscriptions
     * @req     -
     * @res     [Plan]
     */
    getPlans = async (req: Request, res: Response) => {
        const plans = await this._service.getPlans()
        res.json(plans)
    }

    /**
     * @desc    Subscribe to a plan
     * @route   POST /api/subscriptions/subscribe
     * @req     body: { planId }
     * @res     { ok, success, action, expiry }
     */
    subscribe = async (req: Request, res: Response) => {
        const userId = req.user?.id || req.user?.sub
        const { planId } = req.body

        if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' })
        if (!planId) return res.status(400).json({ ok: false, error: 'Plan ID required' })

        const result = await this._service.subscribe(userId, planId)
        res.json({ ok: result.success, ...result })
    }
}
