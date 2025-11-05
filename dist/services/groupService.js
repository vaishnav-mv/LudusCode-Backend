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
exports.GroupService = void 0;
const tsyringe_1 = require("tsyringe");
const AppError_1 = __importDefault(require("../utils/AppError"));
const constants_1 = require("../constants");
const dtoMapper_1 = require("../utils/dtoMapper");
let GroupService = class GroupService {
    constructor(_groupRepository) {
        this._groupRepository = _groupRepository;
    }
    async createGroup(name, description, topics, leaderId) {
        if (!name || !name.trim()) {
            throw new AppError_1.default('Group name cannot be empty', constants_1.HttpStatus.BAD_REQUEST);
        }
        const group = await this._groupRepository.create({ name, description, topics, leader: leaderId });
        return dtoMapper_1.DTOMapper.toGroupResponseDTO(group);
    }
    async getApprovedGroups() {
        const groups = await this._groupRepository.findApproved();
        return groups.map(dtoMapper_1.DTOMapper.toGroupResponseDTO);
    }
    async getMyGroups(leaderId) {
        const groups = await this._groupRepository.findByLeader(leaderId);
        return groups.map(dtoMapper_1.DTOMapper.toGroupResponseDTO);
    }
    async getMyPendingGroups(leaderId) {
        const groups = await this._groupRepository.findByLeader(leaderId);
        return groups
            .map(dtoMapper_1.DTOMapper.toGroupResponseDTO)
            .filter((group) => group.status !== constants_1.GroupStatus.Approved);
    }
    async getGroupById(id) {
        const group = await this._groupRepository.findById(id);
        if (!group) {
            throw new AppError_1.default('Group not found', constants_1.HttpStatus.NOT_FOUND);
        }
        return dtoMapper_1.DTOMapper.toGroupResponseDTO(group);
    }
    async isUserInGroup(groupId, userId) {
        return await this._groupRepository.isUserMember(groupId, userId);
    }
    async joinGroup(groupId, userId) {
        const group = await this._groupRepository.findById(groupId);
        if (!group) {
            throw new AppError_1.default('Group not found', constants_1.HttpStatus.NOT_FOUND);
        }
        if (group.status !== constants_1.GroupStatus.Approved) {
            throw new AppError_1.default('Group is not yet approved', constants_1.HttpStatus.FORBIDDEN);
        }
        await this._groupRepository.addMember(groupId, userId);
    }
    async leaveGroup(groupId, userId) {
        await this._groupRepository.removeMember(groupId, userId);
    }
};
exports.GroupService = GroupService;
exports.GroupService = GroupService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IGroupRepository')),
    __metadata("design:paramtypes", [Object])
], GroupService);
