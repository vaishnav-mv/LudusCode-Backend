import { GroupStatus } from '../../constants';
import { UserResponseDTO } from './UserResponseDTO';

export interface GroupResponseDTO {
  id: string;
  name: string;
  leader: UserResponseDTO | null;
  status: GroupStatus;
  createdAt: string;
}
