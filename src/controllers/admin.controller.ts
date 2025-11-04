import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IAdminService } from '../interfaces/services/IAdminService';
import { ApiResponse } from '../utils/responseHelper';

/**
 * Controller to handle all admin-related requests.
 */
export class AdminController {
  private _adminService: IAdminService;

  constructor() {
    this._adminService = container.resolve<IAdminService>('IAdminService');
  }

 
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
      ApiResponse.success(res, result, 'Users fetched successfully');
    } catch (error) {
      next(error);
    }
  }


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
      ApiResponse.success(res, groups, 'Pending groups fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the total count of pending groups.
   * @param _req - Express Request object.
   * @param res - Express Response to return the pending group count.
   * @param next - Express NextFunction for error forwarding.
   * @returns Promise<void>
   */
  public async getPendingGroupCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await this._adminService.getPendingGroupCount();
      ApiResponse.success(res, { count }, 'Pending group count fetched successfully');
    } catch (error) {
      next(error);
    }
  }


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
      ApiResponse.success(res, updatedGroup, 'Group approved successfully');
    } catch (error) {
      next(error);
    }
  }

 
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
      const { reason } = req.body;
      const updatedGroup = await this._adminService.rejectGroup(id, reason);
      ApiResponse.success(res, updatedGroup, 'Group rejected successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
