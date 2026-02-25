export interface UserResponseDTO {
    id: string;
    username: string;
    avatarUrl: string;
    leaderboardRank?: number;
    elo: number;
    duelsWon: number;
    duelsLost: number;
    isAdmin: boolean;
    isBanned: boolean;
    isPremium: boolean;
    hasPassword?: boolean;
    premiumFeatures?: string[];
    currentPlanId?: string;
    subscriptionExpiry?: Date | string;
    cancelAtPeriodEnd?: boolean;
}

export interface AuthResponseDTO {
    user: UserResponseDTO;
    tokens?: {
        access: string;
        refresh: string;
    };
}
