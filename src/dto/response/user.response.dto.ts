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
}

export interface AuthResponseDTO {
    user: UserResponseDTO;
    tokens?: {
        access: string;
        refresh: string;
    };
}
