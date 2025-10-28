import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IGroupService } from '../interfaces/services/IGroupService';
import AppError from '../utils/AppError';
import { ApiResponse } from '../utils/responseHelper';
import { DTOMapper } from '../utils/dtoMapper';
import { HttpStatus } from '../constants';

/**
 * Controller for handling group-related API requests.
 */
export class GroupController {
  private _groupService: IGroupService;

  constructor() {
    this._groupService = container.resolve<IGroupService>('IGroupService');
  }

  /**
   * Handles the creation of a new group.
   */
  /**
   * Creates a new group for the authenticated user.
   * @param req - Express Request with group payload in `body` and `user`.
   * @param res - Express Response used to return the created group.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaderId = req.user?._id;
      if (!leaderId) {
        throw new AppError('Authentication error: User not found', HttpStatus.UNAUTHORIZED);
      }

      const group = await this._groupService.createGroup(req.body.name, leaderId);
      const groupDTO = DTOMapper.toGroupResponseDTO(group);
      ApiResponse.success(res, groupDTO, 'Group created successfully and awaiting approval', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles fetching groups created by the authenticated user.
   */
  /**
   * Gets groups created by the authenticated user.
   * @param req - Express Request with `user` populated by middleware.
   * @param res - Express Response used to return groups list.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leaderId = req.user?._id;
      if (!leaderId) {
        throw new AppError('Authentication error: User not found', HttpStatus.UNAUTHORIZED);
      }
      const groups = await this._groupService.getMyGroups(leaderId);
      const groupDTOs = groups.map(DTOMapper.toGroupResponseDTO);
      ApiResponse.success(res, groupDTOs, 'User groups fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new GroupController();
