import { singleton } from 'tsyringe'
import { IWalletRepository } from '../interfaces/repositories'
import { WalletModel } from '../models/Wallet'
import { TransactionType } from '../types'

@singleton()
export class WalletRepository implements IWalletRepository {
  async get(userId: string) {
    const wallet = await WalletModel.findOne({ userId }).lean()

    if (wallet) {
      return {
        ...wallet,
        userId: (wallet.userId as any).toString(),
        currency: 'INR'
      } as any
    }

    return {
      userId,
      balance: 0,
      currency: 'INR',
      transactions: []
    } as any
  }

  async deposit(userId: string, amount: number, description: string) {
    const wallet = await WalletModel.findOne({ userId })

    if (!wallet) {
      await WalletModel.create({
        userId,
        balance: amount,
        currency: 'INR',
        transactions: [{
          id: `tx-${Date.now()}`,
          type: TransactionType.Deposit,
          status: 'Completed',
          amount,
          description,
          timestamp: new Date().toISOString()
        }]
      })
      return
    }

    (wallet as any).balance += amount
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: TransactionType.Deposit,
      status: 'Completed',
      amount,
      description,
      timestamp: new Date().toISOString()
    })
    await wallet.save()
  }

  async withdraw(userId: string, amount: number, description: string) {
    const wallet = await WalletModel.findOne({ userId })

    if (!wallet || amount > (wallet as any).balance) {
      return false
    }

    (wallet as any).balance -= amount
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: TransactionType.Withdrawal,
      status: 'Pending',
      amount: -amount,
      description,
      timestamp: new Date().toISOString()
    })
    await wallet.save()
    return true
  }

  async add(userId: string, amount: number, description: string) {
    const wallet = await WalletModel.findOne({ userId })
    const transactionType = amount >= 0 ? TransactionType.DuelWin : TransactionType.DuelWager

    if (!wallet) {
      await WalletModel.create({
        userId,
        balance: amount,
        currency: 'INR',
        transactions: [{
          id: `tx-${Date.now()}`,
          type: transactionType,
          status: 'Completed',
          amount,
          description,
          timestamp: new Date().toISOString()
        }]
      })
      return
    }

    (wallet as any).balance += amount
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      type: transactionType,
      status: 'Completed',
      amount,
      description,
      timestamp: new Date().toISOString()
    })
    await wallet.save()
  }
}
