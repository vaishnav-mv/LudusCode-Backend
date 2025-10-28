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
exports.UserRepository = void 0;
const tsyringe_1 = require("tsyringe");
const User_1 = __importDefault(require("../models/User"));
const BaseRepository_1 = require("./BaseRepository");
const logger_1 = __importDefault(require("../utils/logger"));
const AppError_1 = __importDefault(require("../utils/AppError"));
let UserRepository = class UserRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(User_1.default);
    }
    async findById(id, select) {
        try {
            return await super.findById(id, select);
        }
        catch (error) {
            logger_1.default.error(`UserRepository.findById error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async findByEmail(email, select) {
        try {
            return await super.findOne({ email }, select);
        }
        catch (error) {
            logger_1.default.error(`UserRepository.findByEmail error for ${email}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async findOne(query, select) {
        try {
            return await super.findOne(query, select);
        }
        catch (error) {
            logger_1.default.error(`UserRepository.findOne error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async findAll() {
        try {
            return await super.findAll(undefined, { sort: { createdAt: -1 } });
        }
        catch (error) {
            logger_1.default.error(`UserRepository.findAll error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find all users: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async create(userData) {
        try {
            return await super.create(userData);
        }
        catch (error) {
            logger_1.default.error(`UserRepository.create error: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    async updateById(id, updateData) {
        try {
            return await super.updateById(id.toString(), updateData);
        }
        catch (error) {
            logger_1.default.error(`UserRepository.updateById error for ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], UserRepository);
// Export a default instance for backward compatibility
exports.default = new UserRepository();
