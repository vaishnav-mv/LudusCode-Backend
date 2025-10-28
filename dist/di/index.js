"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
const userRepository_1 = require("../repositories/userRepository");
const groupRepository_1 = require("../repositories/groupRepository");
const authService_1 = require("../services/authService");
const adminService_1 = require("../services/adminService");
const groupService_1 = require("../services/groupService");
const otpService_1 = require("../services/otpService");
const emailService_1 = require("../services/emailService");
// Register repositories
tsyringe_1.container.register('IUserRepository', { useClass: userRepository_1.UserRepository });
tsyringe_1.container.register('IGroupRepository', { useClass: groupRepository_1.GroupRepository });
// Register services
tsyringe_1.container.register('IAuthService', { useClass: authService_1.AuthService });
tsyringe_1.container.register('IAdminService', { useClass: adminService_1.AdminService });
tsyringe_1.container.register('IGroupService', { useClass: groupService_1.GroupService });
tsyringe_1.container.register('IOtpService', { useClass: otpService_1.OtpService });
tsyringe_1.container.register('IEmailService', { useClass: emailService_1.EmailService });
exports.default = tsyringe_1.container;
