"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const tsyringe_1 = require("tsyringe");
const responseHelper_1 = require("../utils/responseHelper");
const dtoMapper_1 = require("../utils/dtoMapper");
/**
 * Controller to handle all admin-related requests.
 */
class AdminController {
    constructor() {
        this._adminService = tsyringe_1.container.resolve('IAdminService');
    }
    /**
     * Handles request to get all users.
     */
    /**
     * Gets all users for admin.
     * @param req - Express Request object.
     * @param res - Express Response to return the users list.
     * @param next - Express NextFunction to pass errors downstream.
     * @returns Promise<void>
     */
    async getAllUsers(req, res, next) {
        try {
            const users = await this._adminService.getAllUsers();
            const userDTOs = users.map(dtoMapper_1.DTOMapper.toUserResponseDTO);
            responseHelper_1.ApiResponse.success(res, userDTOs, 'Users fetched successfully');
        }
        catch (error) {
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
    async getPendingGroups(req, res, next) {
        try {
            const groups = await this._adminService.getPendingGroups();
            const groupDTOs = groups.map(dtoMapper_1.DTOMapper.toGroupResponseDTO);
            responseHelper_1.ApiResponse.success(res, groupDTOs, 'Pending groups fetched successfully');
        }
        catch (error) {
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
    async approveGroup(req, res, next) {
        try {
            const { id } = req.params;
            const updatedGroup = await this._adminService.approveGroup(id);
            const groupDTO = dtoMapper_1.DTOMapper.toGroupResponseDTO(updatedGroup);
            responseHelper_1.ApiResponse.success(res, groupDTO, 'Group approved successfully');
        }
        catch (error) {
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
    async rejectGroup(req, res, next) {
        try {
            const { id } = req.params;
            const updatedGroup = await this._adminService.rejectGroup(id);
            const groupDTO = dtoMapper_1.DTOMapper.toGroupResponseDTO(updatedGroup);
            responseHelper_1.ApiResponse.success(res, groupDTO, 'Group rejected successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminController = AdminController;
exports.default = new AdminController();
