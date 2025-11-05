"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const tsyringe_1 = require("tsyringe");
const constants_1 = require("../constants");
const AppError_1 = __importDefault(require("../utils/AppError"));
const dtoMapper_1 = require("../utils/dtoMapper");
let AdminService = class AdminService {
    constructor(_userRepository, _groupRepository) {
        this._userRepository = _userRepository;
        this._groupRepository = _groupRepository;
    }
    async getAllUsers(page, limit) {
        if (page && limit) {
            const result = await this._userRepository.findAllPaginated(page, limit);
            return {
                users: result.data.map(dtoMapper_1.DTOMapper.toUserResponseDTO),
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            };
        }
        const users = await this._userRepository.findAll();
        return { users: users.map(dtoMapper_1.DTOMapper.toUserResponseDTO) };
    }
    async getPendingGroups() {
        const groups = await this._groupRepository.findPending();
        return groups.map(dtoMapper_1.DTOMapper.toGroupResponseDTO);
    }
    async getPendingGroupCount() {
        return await this._groupRepository.countPending();
    }
    async approveGroup(groupId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group) {
            throw new AppError_1.default('Group not found', constants_1.HttpStatus.NOT_FOUND);
        }
        // Update group status
        group.status = constants_1.GroupStatus.Approved;
        group.rejectionReason = '';
        await group.save();
        // Promote the user to Leader
        await this._userRepository.updateById(group.leader.toString(), { role: constants_1.Role.Leader });
        return dtoMapper_1.DTOMapper.toGroupResponseDTO(group);
    }
    async rejectGroup(groupId, reason) {
        const group = await this._groupRepository.findById(groupId);
        if (!group) {
            throw new AppError_1.default('Group not found', constants_1.HttpStatus.NOT_FOUND);
        }
        const trimmedReason = reason?.trim();
        if (!trimmedReason) {
            throw new AppError_1.default('Rejection reason is required', constants_1.HttpStatus.BAD_REQUEST);
        }
        group.status = constants_1.GroupStatus.Rejected;
        group.rejectionReason = trimmedReason;
        await group.save();
        return dtoMapper_1.DTOMapper.toGroupResponseDTO(group);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __param(1, (0, tsyringe_1.inject)('IGroupRepository')),
    __metadata("design:paramtypes", [Object, Object])
], AdminService);
