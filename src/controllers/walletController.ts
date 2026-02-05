import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'

import { HttpStatus, ResponseMessages } from '../constants'
import { IWalletService } from '../interfaces/services'
import { DepositDTO, WithdrawDTO, WagerDTO, WinDTO } from '../dto/request/wallet.request.dto'
import { mapWallet } from '../utils/mapper'

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
    res.json(wallet ? mapWallet(wallet) : null)
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
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Minimum deposit is ₹1" })
    }

    try {
      const order = await this._service.createDepositOrder(userId, body.amount)
      res.json(order)
    } catch (err: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message })
    }
  }

  /**
   * @desc    Verify Razorpay Payment
   * @route   POST /api/wallet/verify
   * @req     body: { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   * @res     { ok: boolean }
   */
  verify = async (req: Request, res: Response) => {
    const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
      const isValid = await this._service.verifyDeposit(userId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (isValid) {
        res.json({ ok: true, message: "Payment verified successfully" });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid signature" });
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Verification failed" });
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
    const ok = await this._service.withdraw(userId, body.amount, body.vpa, "Test User", "test@ludus.com", "9000090000")
    if (!ok) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: "Withdrawal failed or insufficient funds" })
    }
    res.json({ ok: true })
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
    res.json({ ok: true })
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
    res.json({ ok: true })
  }
}
