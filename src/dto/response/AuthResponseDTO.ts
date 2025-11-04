import { UserResponseDTO } from './UserResponseDTO';

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUserDTO {
  tokens: AuthTokensDTO;
  user: UserResponseDTO;
}

export type AuthResponseDTO = AuthenticatedUserDTO;
