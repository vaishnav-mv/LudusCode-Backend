import { UserResponseDTO } from './UserResponseDTO';

export interface AuthResponseDTO {
  token: string;
  user: UserResponseDTO;
}
