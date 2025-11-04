import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IGroupService } from '../interfaces/services/IGroupService';
import AppError from '../utils/AppError';
import { ApiResponse } from '../utils/responseHelper';
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

      const { name, description, topics } = req.body;
      const group = await this._groupService.createGroup(name, description || '', topics || [], leaderId);
      ApiResponse.success(res, group, 'Group created successfully and awaiting approval', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets all groups.
   * @param req - Express Request.
   * @param res - Express Response used to return groups list.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async getAllGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = await this._groupService.getAllGroups();
      ApiResponse.success(res, groups, 'Groups fetched successfully');
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
      ApiResponse.success(res, groups, 'User groups fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets a specific group by ID.
   * @param req - Express Request with groupId in params.
   * @param res - Express Response used to return the group.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async getGroupById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      if (!groupId) {
        throw new AppError('Group ID is required', HttpStatus.BAD_REQUEST);
      }
      const group = await this._groupService.getGroupById(groupId);
      ApiResponse.success(res, group, 'Group fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Checks if a user is a member of a specific group.
   * @param req - Express Request with groupId and userId in params.
   * @param res - Express Response used to return membership status.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async isUserInGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId, userId } = req.params;
      if (!groupId || !userId) {
        throw new AppError('Group ID and User ID are required', HttpStatus.BAD_REQUEST);
      }
      const isMember = await this._groupService.isUserInGroup(groupId, userId);
      ApiResponse.success(res, { isMember }, 'Group membership checked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allows a user to join a group.
   * @param req - Express Request with groupId in params and authenticated user.
   * @param res - Express Response confirming the join action.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async joinGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;
      if (!groupId || !userId) {
        throw new AppError('Group ID is required', HttpStatus.BAD_REQUEST);
      }
      await this._groupService.joinGroup(groupId, userId.toString());
      ApiResponse.success(res, null, 'Successfully joined the group');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allows a user to leave a group.
   * @param req - Express Request with groupId in params and authenticated user.
   * @param res - Express Response confirming the leave action.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async leaveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?._id;
      if (!groupId || !userId) {
        throw new AppError('Group ID is required', HttpStatus.BAD_REQUEST);
      }
      await this._groupService.leaveGroup(groupId, userId.toString());
      ApiResponse.success(res, null, 'Successfully left the group');
    } catch (error) {
      next(error);
    }
  }
}

export default new GroupController();
