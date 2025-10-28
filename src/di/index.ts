import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from '../repositories/userRepository';
import { GroupRepository } from '../repositories/groupRepository';
import { AuthService } from '../services/authService';
import { AdminService } from '../services/adminService';
import { GroupService } from '../services/groupService';
import { OtpService } from '../services/otpService';
import { EmailService } from '../services/emailService';
import { JwtService } from '../services/jwtService';

// Register repositories
container.register('IUserRepository', { useClass: UserRepository });
container.register('IGroupRepository', { useClass: GroupRepository });

// Register services
container.register('IAuthService', { useClass: AuthService });
container.register('IAdminService', { useClass: AdminService });
container.register('IGroupService', { useClass: GroupService });
container.register('IOtpService', { useClass: OtpService });
container.register('IEmailService', { useClass: EmailService });
container.register('IJwtService', {useClass: JwtService});
export default container;
