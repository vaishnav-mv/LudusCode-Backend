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
const redis_1 = __importDefault(require("../config/redis"));
let AdminService = class AdminService {
    constructor(_userRepository, _groupRepository) {
        this._userRepository = _userRepository;
        this._groupRepository = _groupRepository;
    }
    async getAllUsers() {
        return await this._userRepository.findAll();
    }
    async getPendingGroups() {
        return await this._groupRepository.findPending();
    }
    async approveGroup(groupId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group) {
            throw new AppError_1.default('Group not found', 404);
        }
        // Update group status
        group.status = constants_1.GroupStatus.Approved;
        await group.save();
        // Promote the user to Leader
        await this._userRepository.updateById(group.leader.toString(), { role: constants_1.Role.Leader });
        // Invalidate admin users cache to reflect new role
        try {
            await redis_1.default.del('__express__/api/admin/users');
        }
        catch {
            // Swallow cache errors to avoid blocking approval
        }
        return group;
    }
    async rejectGroup(groupId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group) {
            throw new AppError_1.default('Group not found', 404);
        }
        group.status = constants_1.GroupStatus.Rejected;
        await group.save();
        return group;
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __param(1, (0, tsyringe_1.inject)('IGroupRepository')),
    __metadata("design:paramtypes", [Object, Object])
], AdminService);
