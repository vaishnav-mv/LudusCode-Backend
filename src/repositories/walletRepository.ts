import { singleton } from 'tsyringe'
import { IWalletRepository } from '../interfaces/repositories'
import { WalletModel } from '../models/Wallet'
import { TransactionModel } from '../models/Transaction'
import { TransactionType } from '../types'

@singleton()
export class WalletRepository implements IWalletRepository {
  async get(userId: string) {
    let wallet = await WalletModel.findOne({ userId })

    if (!wallet) {
      wallet = await WalletModel.create({
        userId,
        balance: 0,
        currency: 'INR'
      })
    }

    // wallet is definitely defined here
    const w = wallet!;

    // Fetch recent transactions
    const transactions = await TransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Destructure to avoid returning ObjectId _id
    const { _id, ...rest } = w.toObject ? w.toObject() : w;
    return {
      ...rest,
      id: _id.toString(),
      userId: w.userId.toString(),
      transactions: transactions.map(t => {
        const trans = t as any;
        return {
          ...trans,
          _id: trans._id.toString(),
          id: trans._id.toString(),
          timestamp: trans.createdAt
        };
      })
    }
  }

  // Used for DIRECT deposits (e.g. bonus), not Razorpay flow
  async deposit(userId: string, amount: number, description: string) {
    const wallet = await WalletModel.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount }, $setOnInsert: { currency: 'INR' } },
      { new: true, upsert: true }
    );

    await TransactionModel.create({
      walletId: wallet._id,
      userId,
      amount,
      type: TransactionType.Deposit,
      status: 'Completed',
      description
    });
  }

  async withdraw(userId: string, amount: number, description: string) {
    // Atomic check and deduct
    const wallet = await WalletModel.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );
    console.log(`[WalletRepository] Withdraw for ${userId} amount ${amount}. Result:`, wallet ? 'Success' : 'Failed/Insufficient Found');

    if (!wallet) {
      return false; // Insufficient funds
    }

    await TransactionModel.create({
      walletId: wallet._id,
      userId,
      amount: -amount,
      type: TransactionType.Withdrawal,
      status: 'Pending', // pending admin approval or payout
      description
    });

    return true;
  }

  async add(userId: string, amount: number, description: string) {
    const transactionType = amount >= 0 ? TransactionType.DuelWin : TransactionType.DuelWager;

    // For wagers (negative amount), ensure balance exists
    const query = amount < 0 ? { userId, balance: { $gte: Math.abs(amount) } } : { userId };

    const wallet = await WalletModel.findOneAndUpdate(
      query,
      { $inc: { balance: amount }, $setOnInsert: { currency: 'INR' } },
      { new: true, upsert: amount >= 0 } // upsert only for wins (positive)
    );

    if (!wallet && amount < 0) {
      throw new Error("Insufficient funds for wager");
    }

    if (wallet) {
      await TransactionModel.create({
        walletId: wallet._id,
        userId,
        amount,
        type: transactionType,
        status: 'Completed',
        description
      });
    }
  }
}
