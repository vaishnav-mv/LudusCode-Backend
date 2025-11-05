"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const tsyringe_1 = require("tsyringe");
const responseHelper_1 = require("../utils/responseHelper");
/**
 * Controller to handle all admin-related requests.
 */
class AdminController {
    constructor() {
        this._adminService = tsyringe_1.container.resolve('IAdminService');
    }
    /**
     * Gets all users for admin with optional pagination.
     * @param req - Express Request object with optional query params: page, limit.
     * @param res - Express Response to return the users list.
     * @param next - Express NextFunction to pass errors downstream.
     * @returns Promise<void>
     */
    async getAllUsers(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
            const result = await this._adminService.getAllUsers(page, limit);
            responseHelper_1.ApiResponse.success(res, result, 'Users fetched successfully');
        }
        catch (error) {
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
    async getPendingGroups(req, res, next) {
        try {
            const groups = await this._adminService.getPendingGroups();
            responseHelper_1.ApiResponse.success(res, groups, 'Pending groups fetched successfully');
        }
        catch (error) {
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
    async getPendingGroupCount(req, res, next) {
        try {
            const count = await this._adminService.getPendingGroupCount();
            responseHelper_1.ApiResponse.success(res, { count }, 'Pending group count fetched successfully');
        }
        catch (error) {
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
    async approveGroup(req, res, next) {
        try {
            const { id } = req.params;
            const updatedGroup = await this._adminService.approveGroup(id);
            responseHelper_1.ApiResponse.success(res, updatedGroup, 'Group approved successfully');
        }
        catch (error) {
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
    async rejectGroup(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const updatedGroup = await this._adminService.rejectGroup(id, reason);
            responseHelper_1.ApiResponse.success(res, updatedGroup, 'Group rejected successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminController = AdminController;
exports.default = new AdminController();
