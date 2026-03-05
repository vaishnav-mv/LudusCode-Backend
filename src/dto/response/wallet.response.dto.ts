import { TransactionResponseDTO } from './transaction.response.dto'

export interface WalletResponseDTO {
    userId: string
    balance: number
    currency: string
    transactions: TransactionResponseDTO[]
}
