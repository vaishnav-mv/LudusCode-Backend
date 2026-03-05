import { TransactionType, TransactionStatus } from '../../types';

export interface TransactionResponseDTO {
    id: string;
    userId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    description: string;
    timestamp: string;
}
