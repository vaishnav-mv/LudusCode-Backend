import 'reflect-metadata'
import { container } from 'tsyringe'

// Interfaces (Services)
import {
    IAuthService, IUserService, IGroupService, IDuelService,
    IProblemService, IWalletService, IChatService,
    IAdminService, IJudgeService,
    IAiService,
    ISocialAuthService, IStudySessionService, ISubmissionService, ISubscriptionService
} from '../interfaces/services'

// Interfaces (Providers)
import {
    IJwtProvider, IPasswordProvider, IEmailProvider, ICloudinaryProvider,
    ICodeExecutionProvider, IAiProvider,
    IOtpProvider, IPaymentProvider, IOAuthProvider
} from '../interfaces/providers'

// Interfaces (Repositories)
import {
    IUserRepository, IGroupRepository, IProblemRepository,
    IDuelRepository, IWalletRepository, IChatRepository,
    ISubmissionRepository, IStudySessionRepository,
    ISubscriptionRepository
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
import { SubscriptionRepository } from '../repositories/subscriptionRepository'

// Providers
import { EmailProvider } from '../providers/emailProvider'
import { CloudinaryProvider } from '../providers/cloudinaryProvider'
import { CodeExecutionProvider } from '../providers/codeExecutionProvider'
import { AiProvider } from '../providers/aiProvider'
import { JwtProvider } from '../providers/jwtProvider'
import { PasswordProvider } from '../providers/passwordProvider'
import { OtpProvider } from '../providers/otpProvider'
import { PaymentProvider } from '../providers/paymentProvider'
import { OAuthProvider } from '../providers/oauthProvider'

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
import { CronService } from '../services/cronService'

// Register Repositories
container.registerSingleton<IUserRepository>("IUserRepository", UserRepository)
container.registerSingleton<IGroupRepository>("IGroupRepository", GroupRepository)
container.registerSingleton<IProblemRepository>("IProblemRepository", ProblemRepository)
container.registerSingleton<IDuelRepository>("IDuelRepository", DuelRepository)
container.registerSingleton<IStudySessionRepository>("IStudySessionRepository", StudySessionRepository)
container.registerSingleton<IWalletRepository>("IWalletRepository", WalletRepository)
container.registerSingleton<IChatRepository>("IChatRepository", ChatRepository)
container.registerSingleton<ISubmissionRepository>("ISubmissionRepository", SubmissionRepository)
container.registerSingleton<ISubscriptionRepository>("ISubscriptionRepository", SubscriptionRepository)

// Register Providers
container.registerSingleton<IEmailProvider>("IEmailProvider", EmailProvider)
container.registerSingleton<ICloudinaryProvider>("ICloudinaryProvider", CloudinaryProvider)
container.registerSingleton<ICodeExecutionProvider>("ICodeExecutionProvider", CodeExecutionProvider)
container.registerSingleton<IAiProvider>("IAiProvider", AiProvider)
container.registerSingleton<IJwtProvider>("IJwtProvider", JwtProvider)
container.registerSingleton<IPasswordProvider>("IPasswordProvider", PasswordProvider)
container.registerSingleton<IOtpProvider>("IOtpProvider", OtpProvider)
container.registerSingleton<IPaymentProvider>("IPaymentProvider", PaymentProvider)
container.registerSingleton<IOAuthProvider>("IOAuthProvider", OAuthProvider)

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
container.registerSingleton<CronService>("CronService", CronService)


export default container
