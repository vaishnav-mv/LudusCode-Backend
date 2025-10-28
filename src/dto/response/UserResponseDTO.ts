import { Role } from '../../constants';

export interface UserResponseDTO {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
}
