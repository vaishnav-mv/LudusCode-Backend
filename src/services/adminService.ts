import { injectable, inject } from 'tsyringe';
import { Role, GroupStatus, HttpStatus } from '../constants';
import AppError from '../utils/AppError';
import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import { IGroupRepository } from '../interfaces/repositories/IGroupRepository';
import { IAdminService, PaginatedUsersDTO } from '../interfaces/services/IAdminService';
import { DTOMapper } from '../utils/dtoMapper';

@injectable()
export class AdminService implements IAdminService {
  constructor(
    @inject('IUserRepository') private _userRepository: IUserRepository,
    @inject('IGroupRepository') private _groupRepository: IGroupRepository
  ) {}

  async getAllUsers(page?: number, limit?: number): Promise<PaginatedUsersDTO> {
    if (page && limit) {
      const result = await this._userRepository.findAllPaginated(page, limit);
      return {
        users: result.data.map(DTOMapper.toUserResponseDTO),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    }
    const users = await this._userRepository.findAll();
    return { users: users.map(DTOMapper.toUserResponseDTO) };
  }

  async getPendingGroups() {
    const groups = await this._groupRepository.findPending();
    return groups.map(DTOMapper.toGroupResponseDTO);
  }

  async getPendingGroupCount() {
    return await this._groupRepository.countPending();
  }

  async approveGroup(groupId: string) {
    const group = await this._groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }

    // Update group status
    group.status = GroupStatus.Approved;
    group.rejectionReason = '';
    await group.save();

    // Promote the user to Leader
    await this._userRepository.updateById(group.leader.toString(), { role: Role.Leader });

    return DTOMapper.toGroupResponseDTO(group);
  }

  async rejectGroup(groupId: string, reason: string) {
    const group = await this._groupRepository.findById(groupId);
    if (!group) {
      throw new AppError('Group not found', HttpStatus.NOT_FOUND);
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new AppError('Rejection reason is required', HttpStatus.BAD_REQUEST);
    }

    group.status = GroupStatus.Rejected;
    group.rejectionReason = trimmedReason;
    await group.save();

    return DTOMapper.toGroupResponseDTO(group);
  }
}
