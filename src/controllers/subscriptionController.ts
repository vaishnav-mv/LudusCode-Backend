import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { ISubscriptionService } from '../interfaces/services'
import { ApiResponse } from '../utils/ApiResponse'
import { HttpStatus } from '../constants'
import { asyncHandler } from "../utils/asyncHandler";

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
    getPlans = asyncHandler(async (req: Request, res: Response) => {
        const plans = await this._service.getPlans()
        return ApiResponse.success(res, plans)
    })

    /**
     * @desc    Subscribe to a plan
     * @route   POST /api/subscriptions/subscribe
     * @req     body: { planId }
     * @res     { ok, success, action, expiry }
     */
    subscribe = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id || req.user?.sub
        const { planId } = req.body

        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED, { ok: false })
        if (!planId) return ApiResponse.error(res, 'Plan ID required', HttpStatus.BAD_REQUEST, { ok: false })

        const result = await this._service.subscribe(userId, planId)
        if (!result.success) {
            return ApiResponse.error(res, result.message || 'Subscription failed', HttpStatus.BAD_REQUEST, { ok: false })
        }
        return ApiResponse.success(res, { ok: result.success, ...result })
    })

    /**
     * @desc    Cancel current subscription
     * @route   POST /api/subscriptions/cancel
     * @req     -
     * @res     { success, message }
     */
    cancel = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id || req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)

        const result = await this._service.cancel(userId)
        if (!result.success) {
            return ApiResponse.error(res, result.message || 'Cancel failed', HttpStatus.BAD_REQUEST)
        }
        return ApiResponse.success(res, result)
    })

    /**
     * @desc    Resume pending cancellation
     * @route   POST /api/subscriptions/resume
     * @req     -
     * @res     { success, message }
     */
    resume = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id || req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)

        const result = await this._service.resume(userId)
        if (!result.success) {
            return ApiResponse.error(res, result.message || 'Resume failed', HttpStatus.BAD_REQUEST)
        }
        return ApiResponse.success(res, result)
    })

    /**
     * @desc    Get user subscription history
     * @route   GET /api/subscriptions/history
     * @req     query: { page, limit }
     * @res     { logs, total, page, totalPages }
     */
    history = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.id || req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)

        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const action = req.query.action as string | undefined
        const sortStr = req.query.sortStr as string | undefined
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined

        const result = await this._service.history(userId, page, limit, { action, sortStr, sortOrder })
        return ApiResponse.success(res, result)
    })
}

