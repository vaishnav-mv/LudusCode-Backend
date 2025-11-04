import { Schema } from 'mongoose';
import { GroupResponseDTO } from '../../dto/response/GroupResponseDTO';

export interface IGroupService {
  createGroup(name: string, description: string, topics: string[], leaderId: Schema.Types.ObjectId): Promise<GroupResponseDTO>;
  getAllGroups(): Promise<GroupResponseDTO[]>;
  getMyGroups(leaderId: Schema.Types.ObjectId): Promise<GroupResponseDTO[]>;
  getGroupById(id: string): Promise<GroupResponseDTO>;
  isUserInGroup(groupId: string, userId: string): Promise<boolean>;
  joinGroup(groupId: string, userId: string): Promise<void>;
  leaveGroup(groupId: string, userId: string): Promise<void>;
}
