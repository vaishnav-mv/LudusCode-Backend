import { injectable } from 'tsyringe';
import Group from '../models/Group';
import { IGroup } from '../types/models';
import { GroupStatus, HttpStatus } from '../constants';
import { Schema } from 'mongoose';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { BaseRepository } from './BaseRepository';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

@injectable()
export class GroupRepository extends BaseRepository<IGroup> implements IGroupRepository {
  constructor() {
    super(Group);
  }

  async findById(id: string): Promise<IGroup | null> {
    try {
      return await super.findById(id);
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

  async findByLeader(leaderId: Schema.Types.ObjectId): Promise<IGroup[]> {
    try {
      return await this._model
        .find({ leader: leaderId })
        .populate('leader', 'username email role createdAt')
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

  async create(groupData: { name: string; leader: Schema.Types.ObjectId }): Promise<IGroup> {
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
}

// Export a default instance for backward compatibility
export default new GroupRepository();
