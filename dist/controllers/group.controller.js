"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = void 0;
const tsyringe_1 = require("tsyringe");
const AppError_1 = __importDefault(require("../utils/AppError"));
const responseHelper_1 = require("../utils/responseHelper");
const constants_1 = require("../constants");
/**
 * Controller for handling group-related API requests.
 */
class GroupController {
    constructor() {
        this._groupService = tsyringe_1.container.resolve('IGroupService');
    }
    /**
     * Creates a new group for the authenticated user.
     * @param req - Express Request with group payload in `body` and `user`.
     * @param res - Express Response used to return the created group.
     * @param next - Express NextFunction for error forwarding.
     * @returns Promise<void>
     */
    async createGroup(req, res, next) {
        try {
            const leaderId = req.user?._id;
            if (!leaderId) {
                throw new AppError_1.default('Authentication error: User not found', constants_1.HttpStatus.UNAUTHORIZED);
            }
            const { name, description, topics } = req.body;
            const group = await this._groupService.createGroup(name, description || '', topics || [], leaderId);
            responseHelper_1.ApiResponse.success(res, group, 'Group created successfully and awaiting approval', constants_1.HttpStatus.CREATED);
        }
        catch (error) {
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
    async getAllGroups(req, res, next) {
        try {
            const groups = await this._groupService.getApprovedGroups();
            responseHelper_1.ApiResponse.success(res, groups, 'Groups fetched successfully');
        }
        catch (error) {
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
    async getMyGroups(req, res, next) {
        try {
            const leaderId = req.user?._id;
            if (!leaderId) {
                throw new AppError_1.default('Authentication error: User not found', constants_1.HttpStatus.UNAUTHORIZED);
            }
            const groups = await this._groupService.getMyGroups(leaderId);
            responseHelper_1.ApiResponse.success(res, groups, 'User groups fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getMyPendingGroups(req, res, next) {
        try {
            const leaderId = req.user?._id;
            if (!leaderId) {
                throw new AppError_1.default('Authentication error: User not found', constants_1.HttpStatus.UNAUTHORIZED);
            }
            const groups = await this._groupService.getMyPendingGroups(leaderId);
            responseHelper_1.ApiResponse.success(res, groups, 'Pending group requests fetched successfully');
        }
        catch (error) {
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
    async getGroupById(req, res, next) {
        try {
            const { groupId } = req.params;
            if (!groupId) {
                throw new AppError_1.default('Group ID is required', constants_1.HttpStatus.BAD_REQUEST);
            }
            const group = await this._groupService.getGroupById(groupId);
            responseHelper_1.ApiResponse.success(res, group, 'Group fetched successfully');
        }
        catch (error) {
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
    async isUserInGroup(req, res, next) {
        try {
            const { groupId, userId } = req.params;
            if (!groupId || !userId) {
                throw new AppError_1.default('Group ID and User ID are required', constants_1.HttpStatus.BAD_REQUEST);
            }
            const isMember = await this._groupService.isUserInGroup(groupId, userId);
            responseHelper_1.ApiResponse.success(res, { isMember }, 'Group membership checked successfully');
        }
        catch (error) {
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
    async joinGroup(req, res, next) {
        try {
            const { groupId } = req.params;
            const userId = req.user?._id;
            if (!groupId || !userId) {
                throw new AppError_1.default('Group ID is required', constants_1.HttpStatus.BAD_REQUEST);
            }
            await this._groupService.joinGroup(groupId, userId.toString());
            responseHelper_1.ApiResponse.success(res, null, 'Successfully joined the group');
        }
        catch (error) {
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
    async leaveGroup(req, res, next) {
        try {
            const { groupId } = req.params;
            const userId = req.user?._id;
            if (!groupId || !userId) {
                throw new AppError_1.default('Group ID is required', constants_1.HttpStatus.BAD_REQUEST);
            }
            await this._groupService.leaveGroup(groupId, userId.toString());
            responseHelper_1.ApiResponse.success(res, null, 'Successfully left the group');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GroupController = GroupController;
exports.default = new GroupController();
