import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'

import { HttpStatus } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IWalletService } from '../interfaces/services'
import { DepositDTO, WithdrawDTO, WagerDTO, WinDTO } from '../dto/request/wallet.request.dto'
import { mapWallet } from '../utils/mapper'
import { getErrorMessage } from '../utils/errorUtils'

@singleton()
export class WalletController {
  constructor(@inject("IWalletService") private _service: IWalletService) { }

  /**
   * @desc    Get user wallet
   * @route   GET /api/wallet/:userId
   * @req     params: { userId }
   * @res     { wallet }
   */
  getWallet = async (req: Request, res: Response) => {
    const userId = req.params.userId
    console.log(`[WalletController] Get wallet for userId: ${userId} (param: ${req.params.userId})`);
    const wallet = await this._service.get(userId)
    return ApiResponse.success(res, wallet ? mapWallet(wallet) : null)
  }

  /**
   * @desc    Get wallet transactions (paginated)
   * @route   GET /api/wallet/:userId/transactions
   * @req     params: { userId }, query: { page, limit }
   * @res     { transactions, total, page, totalPages }
   */
  getTransactions = async (req: Request, res: Response) => {
    const userId = req.params.userId
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string | undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined
    const result = await this._service.getTransactions(userId, page, limit, type, startDate, endDate)
    return ApiResponse.success(res, result)
  }

  /**
   * @desc    Create Razorpay Order
   * @route   POST /api/wallet/deposit
   * @req     body: { userId, amount }
   * @res     { order }
   */
  deposit = async (req: Request, res: Response) => {
    const body = req.body as DepositDTO
    const userId = body.userId

    // Validate amount (e.g. min deposit)
    if (body.amount < 1) {
      return ApiResponse.error(res, "Minimum deposit is ₹1", HttpStatus.BAD_REQUEST)
    }

    try {
      const order = await this._service.createDepositOrder(userId, body.amount)
      return ApiResponse.success(res, order)
    } catch (err: unknown) {
      return ApiResponse.error(res, getErrorMessage(err), HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * @desc    Verify Razorpay Payment
   * @route   POST /api/wallet/verify
   * @req     body: { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   * @res     { ok: boolean }
   */
  verify = async (req: Request, res: Response) => {
    const body = req.body as { userId: string, razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string };
    const { userId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature } = body;

    try {
      const isValid = await this._service.verifyDeposit(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature);
      if (isValid) {
        return ApiResponse.success(res, { ok: true, message: "Payment verified successfully" })
      } else {
        return ApiResponse.error(res, "Invalid signature", HttpStatus.BAD_REQUEST)
      }
    } catch (err: unknown) {
      console.error("Verification Error:", err);
      return ApiResponse.error(res, "Verification failed", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * @desc    Withdraw funds (Mock)
   * @route   POST /api/wallet/withdraw
   * @req     body: { userId, amount }
   * @res     { ok: boolean }
   */
  withdraw = async (req: Request, res: Response) => {
    const body = req.body as WithdrawDTO
    const userId = body.userId
    // In a real app, fetch name/email/phone from User Auth context/Database
    // using defaults for demo/test mode as requested
    try {
      const ok = await this._service.withdraw(userId, body.amount, body.vpa, "Test User", "test@ludus.com", "9000090000")
      if (!ok) {
        return ApiResponse.error(res, "Insufficient funds", HttpStatus.BAD_REQUEST)
      }
      return ApiResponse.success(res, { ok: true })
    } catch (err: unknown) {
      console.error("Withdrawal Controller Error:", getErrorMessage(err));
      return ApiResponse.error(res, getErrorMessage(err), HttpStatus.BAD_REQUEST)
    }
  }

  /**
   * @desc    Place a wager
   * @route   POST /api/wallet/wager
   * @req     body: { userId, amount, description }
   * @res     { ok: boolean }
   */
  wager = async (req: Request, res: Response) => {
    const body = req.body as WagerDTO
    const userId = body.userId
    await this._service.wager(userId, body.amount, body.description)
    return ApiResponse.success(res, { ok: true })
  }

  /**
   * @desc    Process a win
   * @route   POST /api/wallet/win
   * @req     body: { userId, amount, description }
   * @res     { ok: boolean }
   */
  win = async (req: Request, res: Response) => {
    const body = req.body as WinDTO
    const userId = body.userId
    await this._service.win(userId, body.amount, body.description)
    return ApiResponse.success(res, { ok: true })
  }
}
