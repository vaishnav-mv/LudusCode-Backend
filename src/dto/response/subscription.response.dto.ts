export interface SubscriptionPlanResponseDTO {
    id: string;
    name: string;
    price: number;
    period: string;
    maxDailyDuels?: number;
    features: string[];
}

export interface SubscriptionLogResponseDTO {
    id: string;
    userId: string;
    planId: SubscriptionPlanResponseDTO | string;
    action: string;
    amount: number;
    expiryDate?: string;
    timestamp: string;
}
