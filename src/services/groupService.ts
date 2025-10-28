import { injectable, inject } from 'tsyringe';
import { Schema } from 'mongoose';
import AppError from '../utils/AppError';
import { HttpStatus } from '../constants';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { IGroupService } from '../interfaces/services/IGroupService';


@injectable()
export class GroupService implements IGroupService {
  constructor(@inject('IGroupRepository') private _groupRepository: IGroupRepository) {}

  async createGroup(name: string, leaderId: Schema.Types.ObjectId) {
    if (!name || !name.trim()) {
      throw new AppError('Group name cannot be empty', HttpStatus.BAD_REQUEST);
    }
    return await this._groupRepository.create({ name, leader: leaderId });
  }

  async getMyGroups(leaderId: Schema.Types.ObjectId) {
    return await this._groupRepository.findByLeader(leaderId);
  }
}

