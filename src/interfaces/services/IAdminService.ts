import { IUser, IGroup } from '../../types/models';

export interface IAdminService {
  getAllUsers(
    page?: number,
    limit?: number
  ): Promise<
    | IUser[]
    | {
        data: IUser[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }
  >;
  getPendingGroups(): Promise<IGroup[]>;
  approveGroup(groupId: string): Promise<IGroup>;
  rejectGroup(groupId: string): Promise<IGroup>;
}
