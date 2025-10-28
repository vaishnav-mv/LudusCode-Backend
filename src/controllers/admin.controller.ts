import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IAdminService } from '../interfaces/services/IAdminService';
import { ApiResponse } from '../utils/responseHelper';
import { DTOMapper } from '../utils/dtoMapper';

/**
 * Controller to handle all admin-related requests.
 */
export class AdminController {
  private _adminService: IAdminService;

  constructor() {
    this._adminService = container.resolve<IAdminService>('IAdminService');
  }

  /**
   * Handles request to get all users.
   */
  /**
   * Gets all users for admin with optional pagination.
   * @param req - Express Request object with optional query params: page, limit.
   * @param res - Express Response to return the users list.
   * @param next - Express NextFunction to pass errors downstream.
   * @returns Promise<void>
   */
  public async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await this._adminService.getAllUsers(page, limit);

      // Check if result is paginated or just an array
      if (Array.isArray(result)) {
        const userDTOs = result.map(DTOMapper.toUserResponseDTO);
        ApiResponse.success(res, userDTOs, 'Users fetched successfully');
      } else {
        const userDTOs = result.data.map(DTOMapper.toUserResponseDTO);
        ApiResponse.success(
          res,
          {
            users: userDTOs,
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages,
            },
          },
          'Users fetched successfully'
        );
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles request to get pending groups.
   */
  /**
   * Retrieves pending groups awaiting approval.
   * @param req - Express Request object.
   * @param res - Express Response to return the pending groups.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async getPendingGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = await this._adminService.getPendingGroups();
      const groupDTOs = groups.map(DTOMapper.toGroupResponseDTO);
      ApiResponse.success(res, groupDTOs, 'Pending groups fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles request to approve a group.
   */
  /**
   * Approves a group by ID.
   * @param req - Express Request with group `id` in `params`.
   * @param res - Express Response to return the updated group.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async approveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updatedGroup = await this._adminService.approveGroup(id);
      const groupDTO = DTOMapper.toGroupResponseDTO(updatedGroup);
      ApiResponse.success(res, groupDTO, 'Group approved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handles request to reject a group.
   */
  /**
   * Rejects a group by ID.
   * @param req - Express Request with group `id` in `params`.
   * @param res - Express Response to return the updated group.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async rejectGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updatedGroup = await this._adminService.rejectGroup(id);
      const groupDTO = DTOMapper.toGroupResponseDTO(updatedGroup);
      ApiResponse.success(res, groupDTO, 'Group rejected successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
