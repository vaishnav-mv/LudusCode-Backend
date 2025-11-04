import { GroupResponseDTO } from '../../dto/response/GroupResponseDTO';
import { UserResponseDTO } from '../../dto/response/UserResponseDTO';

export interface PaginatedUsersDTO {
  users: UserResponseDTO[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IAdminService {
  getAllUsers(page?: number, limit?: number): Promise<PaginatedUsersDTO>;
  getPendingGroups(): Promise<GroupResponseDTO[]>;
  getPendingGroupCount(): Promise<number>;
  approveGroup(groupId: string): Promise<GroupResponseDTO>;
  rejectGroup(groupId: string, reason: string): Promise<GroupResponseDTO>;
}
