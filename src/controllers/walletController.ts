import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IWalletService } from '../interfaces/services'
import { DepositDTO, WithdrawDTO, WagerDTO, WinDTO } from '../dto/request/wallet.request.dto'
import { asyncHandler } from "../utils/asyncHandler";
import logger from '../utils/logger';

@singleton()
export class WalletController {
  constructor(@inject("IWalletService") private _service: IWalletService) { }


  /**
   * @desc    Get user wallet
   * @route   GET /api/wallet/:userId
   * @req     params: { userId }
   * @res     { wallet }
   */
  getWallet = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId
    logger.debug(`[WalletController] Get wallet for userId: ${userId}`);
    const wallet = await this._service.get(userId)
    return ApiResponse.success(res, wallet)
  })

  /**
   * @desc    Get wallet transactions (paginated)
   * @route   GET /api/wallet/:userId/transactions
   * @req     params: { userId }, query: { page, limit }
   * @res     { transactions, total, page, totalPages }
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string | undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const result = await this._service.getTransactions(userId, page, limit, type, startDate, endDate)
    return ApiResponse.success(res, result)
  })

  /**
   * @desc    Create Razorpay Order
   * @route   POST /api/wallet/deposit
   * @req     body: { userId, amount }
   * @res     { order }
   */
  deposit = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as DepositDTO
    const userId = body.userId
    if (body.amount < 1) {
      return ApiResponse.error(res, "Minimum deposit is ₹1", HttpStatus.BAD_REQUEST)
    }
    const order = await this._service.createDepositOrder(userId, body.amount)
    return ApiResponse.success(res, order)
  })

  /**
   * @desc    Verify Razorpay Payment
   * @route   POST /api/wallet/verify
   * @req     body: { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   * @res     { ok: boolean }
   */
  verify = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { userId: string, razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string };
    const { userId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature } = body;
    const isValid = await this._service.verifyDeposit(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (isValid) {
      return ApiResponse.success(res, { ok: true, message: "Payment verified successfully" })
    } else {
      return ApiResponse.error(res, "Invalid signature", HttpStatus.BAD_REQUEST)
    }
  })

  /**
   * @desc    Withdraw funds (Mock)
   * @route   POST /api/wallet/withdraw
   * @req     body: { userId, amount }
   * @res     { ok: boolean }
   */
  withdraw = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as WithdrawDTO
    const userId = body.userId
    const ok = await this._service.withdraw(userId, body.amount, body.vpa)
    if (!ok) {
      return ApiResponse.error(res, "Insufficient funds", HttpStatus.BAD_REQUEST)
    }
    return ApiResponse.success(res, { ok: true })
  })

  /**
   * @desc    Place a wager
   * @route   POST /api/wallet/wager
   * @req     body: { userId, amount, description }
   * @res     { ok: boolean }
   */
  wager = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as WagerDTO
    const userId = body.userId
    await this._service.wager(userId, body.amount, body.description)
    return ApiResponse.success(res, { ok: true })
  })

  /**
   * @desc    Process a win
   * @route   POST /api/wallet/win
   * @req     body: { userId, amount, description }
   * @res     { ok: boolean }
   */
  win = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as WinDTO
    const userId = body.userId
    await this._service.win(userId, body.amount, body.description)
    return ApiResponse.success(res, { ok: true })
  })
}
