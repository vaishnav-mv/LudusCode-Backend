import { IGroup } from '../../types/models';
import { Schema } from 'mongoose';

export interface IGroupService {
  createGroup(name: string, leaderId: Schema.Types.ObjectId): Promise<IGroup>;
  getMyGroups(leaderId: Schema.Types.ObjectId): Promise<IGroup[]>;
}
