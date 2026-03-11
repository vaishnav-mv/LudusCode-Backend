import { TransactionType, TransactionStatus } from '../../types';

export interface TransactionResponseDTO {
    id: string;
    userId: string | { id: string, username?: string, email?: string };
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    description: string;
    timestamp: string;
}
