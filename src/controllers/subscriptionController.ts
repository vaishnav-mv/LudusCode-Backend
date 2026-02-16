import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { ISubscriptionService } from '../interfaces/services'
import { ApiResponse } from '../utils/ApiResponse'
import { HttpStatus } from '../constants'

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
        return ApiResponse.success(res, plans)
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

        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED, { ok: false })
        if (!planId) return ApiResponse.error(res, 'Plan ID required', HttpStatus.BAD_REQUEST, { ok: false })

        const result = await this._service.subscribe(userId, planId)
        return ApiResponse.success(res, { ok: result.success, ...result })
    }
}
