import { IUser } from '../../types/models';
import { Schema } from 'mongoose';

export interface IUserRepository {
  findById(id: string, select?: string): Promise<IUser | null>;
  findByEmail(email: string, select?: string): Promise<IUser | null>;
  findOne(query: object, select?: string): Promise<IUser | null>;
  findAll(): Promise<IUser[]>;
  findAllPaginated(
    page?: number,
    limit?: number
  ): Promise<{
    data: IUser[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>;
  create(userData: Partial<IUser>): Promise<IUser>;
  updateById(id: string | Schema.Types.ObjectId, updateData: Partial<IUser>): Promise<IUser | null>;
}
