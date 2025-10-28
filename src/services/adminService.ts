import { injectable, inject } from 'tsyringe';
import { Role, GroupStatus, HttpStatus } from '../constants';
import AppError from '../utils/AppError';
import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { IAdminService } from '../interfaces/services/IAdminService';

@injectable()
export class AdminService implements IAdminService {
  constructor(
    @inject('IUserRepository') private _userRepository: IUserRepository,
    @inject('IGroupRepository') private _groupRepository: IGroupRepository
  ) {}

  async getAllUsers(page?: number, limit?: number) {
    if (page && limit) {
      return await this._userRepository.findAllPaginated(page, limit);
    }
    return await this._userRepository.findAll();
  }

  async getPendingGroups() {
    return await this._groupRepository.findPending();
  }

  async approveGroup(groupId: string) {
    const group = await this._groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }

    // Update group status
    group.status = GroupStatus.Approved;
    await group.save();

    // Promote the user to Leader
    await this._userRepository.updateById(group.leader.toString(), { role: Role.Leader });

    return group;
  }

  async rejectGroup(groupId: string) {
    const group = await this._groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }

    group.status = GroupStatus.Rejected;
    await group.save();

    return group;
  }
}
