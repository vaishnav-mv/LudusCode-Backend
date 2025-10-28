"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = void 0;
const tsyringe_1 = require("tsyringe");
const AppError_1 = __importDefault(require("../utils/AppError"));
const responseHelper_1 = require("../utils/responseHelper");
const dtoMapper_1 = require("../utils/dtoMapper");
/**
 * Controller for handling group-related API requests.
 */
class GroupController {
    constructor() {
        this._groupService = tsyringe_1.container.resolve('IGroupService');
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
    async createGroup(req, res, next) {
        try {
            const leaderId = req.user?._id;
            if (!leaderId) {
                throw new AppError_1.default('Authentication error: User not found', 401);
            }
            const group = await this._groupService.createGroup(req.body.name, leaderId);
            const groupDTO = dtoMapper_1.DTOMapper.toGroupResponseDTO(group);
            responseHelper_1.ApiResponse.success(res, groupDTO, 'Group created successfully and awaiting approval', 201);
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
                throw new AppError_1.default('Authentication error: User not found', 401);
            }
            const groups = await this._groupService.getMyGroups(leaderId);
            const groupDTOs = groups.map(dtoMapper_1.DTOMapper.toGroupResponseDTO);
            responseHelper_1.ApiResponse.success(res, groupDTOs, 'User groups fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GroupController = GroupController;
exports.default = new GroupController();
