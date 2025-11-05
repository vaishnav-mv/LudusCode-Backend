import { IGroup } from '../../types/models';
import { Schema, QueryOptions } from 'mongoose';

export interface IGroupRepository {
  findById(id: string): Promise<IGroup | null>;
  findAll(projection?: any, options?: QueryOptions): Promise<IGroup[]>;
  findApproved(): Promise<IGroup[]>;
  findPending(): Promise<IGroup[]>;
  countPending(): Promise<number>;
  findByLeader(leaderId: Schema.Types.ObjectId): Promise<IGroup[]>;
  create(groupData: { name: string; description: string; topics: string[]; leader: Schema.Types.ObjectId }): Promise<IGroup>;
  updateById(id: string, updateData: Partial<IGroup>): Promise<IGroup | null>;
  isUserMember(groupId: string, userId: string): Promise<boolean>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
}
