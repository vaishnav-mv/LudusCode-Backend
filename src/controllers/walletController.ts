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
   * @desc    Deposit funds (Mock)
   * @route   POST /api/wallet/deposit
   * @req     body: { userId, amount }
   * @res     { ok: boolean }
   */
  deposit = async (req: Request, res: Response) => {
    const body = req.body as DepositDTO
    const userId = body.userId
    await this._service.deposit(userId, body.amount)
    res.json({ ok: true })
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
    const ok = await this._service.withdraw(userId, body.amount)
    if (!ok) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: ResponseMessages.INSUFFICIENT_FUNDS })
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
