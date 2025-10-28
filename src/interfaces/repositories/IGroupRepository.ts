import { IGroup } from '../../types/models';
import { Schema } from 'mongoose';

export interface IGroupRepository {
  findById(id: string): Promise<IGroup | null>;
  findPending(): Promise<IGroup[]>;
  findByLeader(leaderId: Schema.Types.ObjectId): Promise<IGroup[]>;
  create(groupData: { name: string; leader: Schema.Types.ObjectId }): Promise<IGroup>;
  updateById(id: string, updateData: Partial<IGroup>): Promise<IGroup | null>;
}
