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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupRepository = void 0;
const tsyringe_1 = require("tsyringe");
const Group_1 = __importDefault(require("../models/Group"));
const constants_1 = require("../constants");
const BaseRepository_1 = require("./BaseRepository");
const logger_1 = __importDefault(require("../utils/logger"));
const AppError_1 = __importDefault(require("../utils/AppError"));
let GroupRepository = class GroupRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Group_1.default);
    }
    async findById(id) {
        try {
            return await super.findById(id);
        }
        catch (error) {
            logger_1.default.error(`GroupRepository.findById error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find group by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async findPending() {
        try {
            return await this._model
                .find({ status: constants_1.GroupStatus.Pending })
                .populate('leader', 'username email role createdAt')
                .sort({ createdAt: -1 });
        }
        catch (error) {
            logger_1.default.error(`GroupRepository.findPending error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find pending groups: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async findByLeader(leaderId) {
        try {
            return await this._model.find({ leader: leaderId }).sort({ createdAt: -1 });
        }
        catch (error) {
            logger_1.default.error(`GroupRepository.findByLeader error for leader ${leaderId}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find groups by leader: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async create(groupData) {
        try {
            return await super.create(groupData);
        }
        catch (error) {
            logger_1.default.error(`GroupRepository.create error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async updateById(id, updateData) {
        try {
            return await super.updateById(id, updateData);
        }
        catch (error) {
            logger_1.default.error(`GroupRepository.updateById error for ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
};
exports.GroupRepository = GroupRepository;
exports.GroupRepository = GroupRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], GroupRepository);
// Export a default instance for backward compatibility
exports.default = new GroupRepository();
