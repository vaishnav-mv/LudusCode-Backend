import { singleton, inject } from 'tsyringe'

import { IWalletRepository } from '../interfaces/repositories'
import { IWalletService } from '../interfaces/services'

@singleton()
export class WalletService implements IWalletService {
    constructor(@inject("IWalletRepository") private _wallets: IWalletRepository) { }

    async get(userId: string) {
        return this._wallets.get(userId);
    }

    async deposit(userId: string, amount: number) {
        await this._wallets.deposit(userId, amount, `Deposit of ₹${amount.toFixed(2)}`);
    }

    async withdraw(userId: string, amount: number) {
        return this._wallets.withdraw(userId, amount, `Withdrawal request for ₹${amount.toFixed(2)}`);
    }

    async wager(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, -amount, description);
    }

    async win(userId: string, amount: number, description: string) {
        await this._wallets.add(userId, amount, description);
    }
}
