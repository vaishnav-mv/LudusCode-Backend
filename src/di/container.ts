import 'reflect-metadata'
import { container } from 'tsyringe'

// Interfaces (Services)
import {
    IAuthService, IUserService, IGroupService, IDuelService,
    IProblemService, IWalletService, IChatService,
    IAiService, IAdminService, IJudgeService,
    IJwtService, IOtpService, IEmailService, ICloudinaryService,
    ISocialAuthService, IStudySessionService, ISubmissionService, ISubscriptionService
} from '../interfaces/services'

// Interfaces (Repositories)
import {
    IUserRepository, IGroupRepository, IProblemRepository,
    IDuelRepository, IWalletRepository, IChatRepository,
    ISubmissionRepository, IStudySessionRepository
} from '../interfaces/repositories'

// Repositories
import { UserRepository } from '../repositories/userRepository'
import { GroupRepository } from '../repositories/groupRepository'
import { ProblemRepository } from '../repositories/problemRepository'
import { DuelRepository } from '../repositories/duelRepository'
import { StudySessionRepository } from '../repositories/studySessionRepository'
import { WalletRepository } from '../repositories/walletRepository'
import { ChatRepository } from '../repositories/chatRepository'
import { SubmissionRepository } from '../repositories/submissionRepository'

// Services
import { AuthService } from '../services/authService'
import { UserService } from '../services/userService'
import { GroupService } from '../services/groupService'
import { DuelService } from '../services/duelService'
import { StudySessionService } from '../services/studySessionService'
import { ProblemService } from '../services/problemService'
import { WalletService } from '../services/walletService'
import { ChatService } from '../services/chatService'
import { AiService } from '../services/aiService'
import { AdminService } from '../services/adminService'
import { JudgeService } from '../services/judgeService'
import { SocialAuthService } from '../services/socialAuthService'
import { SubmissionService } from '../services/submissionService'
import { SubscriptionService } from '../services/subscriptionService'

// Helpers
import { JwtService } from '../services/jwtService'
import { OtpService } from '../services/otpService'
import { EmailService } from '../services/emailService'
import { CloudinaryService } from '../services/cloudinaryService'

// Register Repositories
container.registerSingleton<IUserRepository>("IUserRepository", UserRepository)
container.registerSingleton<IGroupRepository>("IGroupRepository", GroupRepository)
container.registerSingleton<IProblemRepository>("IProblemRepository", ProblemRepository)
container.registerSingleton<IDuelRepository>("IDuelRepository", DuelRepository)
container.registerSingleton<IStudySessionRepository>("IStudySessionRepository", StudySessionRepository)
container.registerSingleton<IWalletRepository>("IWalletRepository", WalletRepository)
container.registerSingleton<IChatRepository>("IChatRepository", ChatRepository)
container.registerSingleton<ISubmissionRepository>("ISubmissionRepository", SubmissionRepository)

// Register Services
container.registerSingleton<IAuthService>("IAuthService", AuthService)
container.registerSingleton<ISocialAuthService>("ISocialAuthService", SocialAuthService)
container.registerSingleton<IUserService>("IUserService", UserService)
container.registerSingleton<IGroupService>("IGroupService", GroupService)
container.registerSingleton<IDuelService>("IDuelService", DuelService)
container.registerSingleton<IStudySessionService>("IStudySessionService", StudySessionService)
container.registerSingleton<IProblemService>("IProblemService", ProblemService)
container.registerSingleton<IWalletService>("IWalletService", WalletService)
container.registerSingleton<IChatService>("IChatService", ChatService)
container.registerSingleton<IAiService>("IAiService", AiService)
container.registerSingleton<IAdminService>("IAdminService", AdminService)
container.registerSingleton<IJudgeService>("IJudgeService", JudgeService)
container.registerSingleton<ISubmissionService>("ISubmissionService", SubmissionService)
container.registerSingleton<ISubscriptionService>("ISubscriptionService", SubscriptionService)

// Register Helpers
container.registerSingleton<IJwtService>("IJwtService", JwtService)
container.registerSingleton<IOtpService>("IOtpService", OtpService)
container.registerSingleton<IEmailService>("IEmailService", EmailService)
container.registerSingleton<ICloudinaryService>("ICloudinaryService", CloudinaryService)

export default container
