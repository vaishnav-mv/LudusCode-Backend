import { injectable } from 'tsyringe';
import mongoose, { Schema } from 'mongoose';
import Group from '../models/Group';
import { IGroup } from '../types/models';
import { GroupStatus, HttpStatus } from '../constants';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { BaseRepository } from './BaseRepository';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

@injectable()
export class GroupRepository extends BaseRepository<IGroup> implements IGroupRepository {
  constructor() {
    super(Group);
  }

  async findApproved(): Promise<IGroup[]> {
    try {
      return await this._model
        .find({ status: GroupStatus.Approved })
        .populate('leader', 'username email role createdAt')
        .populate('members', 'username email role createdAt')
        .sort({ createdAt: -1 });
    } catch (error) {
      logger.error(
        `GroupRepository.findApproved error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find approved groups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findById(id: string): Promise<IGroup | null> {
    try {
      return await this._model.findById(id).populate('leader', 'username email role createdAt').populate('members', 'username email role createdAt');
    } catch (error) {
      logger.error(
        `GroupRepository.findById error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find group by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findPending(): Promise<IGroup[]> {
    try {
      return await this._model
        .find({ status: GroupStatus.Pending })
        .populate('leader', 'username email role createdAt')
        .sort({ createdAt: -1 });
    } catch (error) {
      logger.error(
        `GroupRepository.findPending error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find pending groups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async countPending(): Promise<number> {
    try {
      return await super.count({ status: GroupStatus.Pending });
    } catch (error) {
      logger.error(
        `GroupRepository.countPending error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to count pending groups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findByLeader(leaderId: Schema.Types.ObjectId): Promise<IGroup[]> {
    try {
      return await this._model
        .find({ leader: leaderId })
        .populate('leader', 'username email role createdAt')
        .populate('members', 'username email role createdAt')
        .sort({ createdAt: -1 });
    } catch (error) {
      logger.error(
        `GroupRepository.findByLeader error for leader ${leaderId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find groups by leader: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async create(groupData: { name: string; description: string; topics: string[]; leader: Schema.Types.ObjectId }): Promise<IGroup> {
    try {
      return await super.create(groupData);
    } catch (error) {
      logger.error(
        `GroupRepository.create error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateById(id: string, updateData: Partial<IGroup>): Promise<IGroup | null> {
    try {
      return await super.updateById(id, updateData);
    } catch (error) {
      logger.error(
        `GroupRepository.updateById error for ID ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    try {
      const group = await this._model.findById(groupId);
      if (!group) return false;
      return group.members.some(member => member.toString() === userId);
    } catch (error) {
      logger.error(
        `GroupRepository.isUserMember error for group ${groupId} and user ${userId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to check group membership: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    try {
      const group = await this._model.findById(groupId);
      if (!group) {
        throw new AppError('Group not found', HttpStatus.NOT_FOUND);
      }
      if (group.members.some(member => member.toString() === userId)) {
        throw new AppError('User is already a member of this group', HttpStatus.CONFLICT);
      }
      group.members.push(new Schema.Types.ObjectId(userId));
      await group.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        `GroupRepository.addMember error for group ${groupId} and user ${userId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to add member to group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    try {
      const group = await this._model.findById(groupId);
      if (!group) {
        throw new AppError('Group not found', HttpStatus.NOT_FOUND);
      }
      const memberIndex = group.members.findIndex(member => member.toString() === userId);
      if (memberIndex === -1) {
        throw new AppError('User is not a member of this group', HttpStatus.BAD_REQUEST);
      }
      group.members.splice(memberIndex, 1);
      await group.save();
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error(
        `GroupRepository.removeMember error for group ${groupId} and user ${userId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to remove member from group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

// Export a default instance for backward compatibility
export default new GroupRepository();
