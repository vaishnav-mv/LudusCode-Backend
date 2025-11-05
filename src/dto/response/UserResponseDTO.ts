import { Role } from '../../constants';

export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  rank: string;
  elo: number;
  duelsWon: number;
  duelsLost: number;
  role: Role;
  isAdmin?: boolean;
  isBanned?: boolean;
  isPremium?: boolean;
}
