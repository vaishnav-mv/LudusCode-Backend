export interface WalletResponseDTO {
    userId: string
    balance: number
    currency: string
    transactions: Transaction[]
}
import { Transaction } from '../../types'
