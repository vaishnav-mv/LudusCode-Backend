import { GroupStatus } from '../../constants';
import { UserResponseDTO } from './UserResponseDTO';

export interface GroupResponseDTO {
  id: string;
  name: string;
  description: string;
  topics: string[];
  leader: UserResponseDTO | null;
  members: UserResponseDTO[];
  status: GroupStatus;
  rejectionReason?: string;
  createdAt: string;
}
