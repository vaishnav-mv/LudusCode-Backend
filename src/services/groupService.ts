import { injectable, inject } from 'tsyringe';
import { Schema } from 'mongoose';
import AppError from '../utils/AppError';
import { GroupStatus, HttpStatus } from '../constants';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { IGroupService } from '../interfaces/services/IGroupService';
import { DTOMapper } from '../utils/dtoMapper';


@injectable()
export class GroupService implements IGroupService {
  constructor(@inject('IGroupRepository') private _groupRepository: IGroupRepository) {}

  async createGroup(
    name: string,
    description: string,
    topics: string[],
    leaderId: Schema.Types.ObjectId
  ) {
    if (!name || !name.trim()) {
      throw new AppError('Group name cannot be empty', HttpStatus.BAD_REQUEST);
    }
    const group = await this._groupRepository.create({ name, description, topics, leader: leaderId });
    return DTOMapper.toGroupResponseDTO(group);
  }

  async getApprovedGroups() {
    const groups = await this._groupRepository.findApproved();
    return groups.map(DTOMapper.toGroupResponseDTO);
  }

  async getMyGroups(leaderId: Schema.Types.ObjectId) {
    const groups = await this._groupRepository.findByLeader(leaderId);
    return groups.map(DTOMapper.toGroupResponseDTO);
  }

  async getMyPendingGroups(leaderId: Schema.Types.ObjectId) {
    const groups = await this._groupRepository.findByLeader(leaderId);
    return groups
      .map(DTOMapper.toGroupResponseDTO)
      .filter((group) => group.status !== GroupStatus.Approved);
  }

  async getGroupById(id: string) {
    const group = await this._groupRepository.findById(id);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }
    return DTOMapper.toGroupResponseDTO(group);
  }

  async isUserInGroup(groupId: string, userId: string) {
    return await this._groupRepository.isUserMember(groupId, userId);
  }

  async joinGroup(groupId: string, userId: string) {
    const group = await this._groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }

    if (group.status !== GroupStatus.Approved) {
      throw new AppError('Group is not yet approved', HttpStatus.FORBIDDEN);
    }

    await this._groupRepository.addMember(groupId, userId);
  }

  async leaveGroup(groupId: string, userId: string) {
    await this._groupRepository.removeMember(groupId, userId);
  }
}

