import { User, SubmissionResult, Duel, Wallet, Problem, PaginatedResponse, ChatMessage, StudySession, RazorpayOrder, JwtPayload, SubscriptionPlan, SubscriptionLog, Transaction } from '../types'
import { SubmissionResponseDTO } from '../dto/response/submission.response.dto'
import { UserResponseDTO } from '../dto/response/user.response.dto'
import { GroupResponseDTO } from '../dto/response/group.response.dto'
import { DuelResponseDTO } from '../dto/response/duel.response.dto'
import { ProblemResponseDTO } from '../dto/response/problem.response.dto'
import { TransactionResponseDTO } from '../dto/response/transaction.response.dto'
import { SubscriptionPlanResponseDTO, SubscriptionLogResponseDTO } from '../dto/response/subscription.response.dto'
import { StudySessionResponseDTO } from '../dto/response/studySession.response.dto'
import { WalletResponseDTO } from '../dto/response/wallet.response.dto'
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto'

export interface IJwtService {
  signAccess(payload: object): string
  signRefresh(payload: object): string
  verify(token: string): JwtPayload | string
}

export interface IPasswordService {
  hash(password: string): string // Sync for now as bcrypt.hashSync was used
  compare(password: string, hash: string): boolean
}

export interface IAuthService {
  login(email: string, password: string): Promise<{ user: UserResponseDTO, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  adminLogin(email: string, password: string): Promise<{ user: UserResponseDTO, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  register(username: string, email: string, password: string): Promise<{ id: string }>
  verifyOtp(email: string, code: string): Promise<{ ok: boolean, user?: UserResponseDTO, tokens?: { access: string, refresh: string }, cookie?: { domain: string, secure: boolean } }>
  resendVerificationOtp(email: string): Promise<boolean>
  refresh(refreshToken: string): Promise<{ access: string }>
  forgotPassword(email: string): Promise<boolean>
  resetPassword(email: string, code: string, newPassword: string): Promise<boolean>
  getMe(userId: string): Promise<UserResponseDTO>
}

export interface ISocialAuthService {
  getGoogleAuthUrl(): string
  handleGoogleCallback(code: string): Promise<{ user: UserResponseDTO, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  getGithubAuthUrl(): string
  handleGithubCallback(code: string): Promise<{ user: UserResponseDTO, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
}

export interface IUserService {
  profile(id: string): Promise<{
    user: UserResponseDTO | null;
    recentDuels: DuelResponseDTO[];
    joinedGroups: GroupResponseDTO[];
    submissionStats: { total: number, accepted: number, acceptanceRate: number };
  } | null>
  setPremium(id: string): Promise<UserResponseDTO | null>
  leaderboard(page: number, limit: number): Promise<{ users: UserResponseDTO[], total: number, page: number, totalPages: number }>
  updateProfile(id: string, data: Partial<User>): Promise<UserResponseDTO | null>
  changePassword(id: string, oldPass: string, newPass: string): Promise<void>
  search(query: string): Promise<UserResponseDTO[]>
}




export interface GroupListParams {
  query?: string;
  sort?: string;
  isPrivate?: string | boolean;
  page?: number;
  limit?: number;
}

export interface IGroupService {
  list(userId?: string, params?: GroupListParams): Promise<PaginatedResponse<GroupResponseDTO>>
  detail(id: string): Promise<GroupResponseDTO | undefined>
  join(groupId: string, userId: string): Promise<boolean>
  leave(groupId: string, userId: string): Promise<boolean>
  approveJoin(groupId: string, userId: string, requesterId: string): Promise<boolean>
  rejectJoin(groupId: string, userId: string, requesterId: string): Promise<boolean>
  kickMember(groupId: string, userId: string, requesterId: string): Promise<boolean>
  blockMember(groupId: string, userId: string, requesterId: string): Promise<boolean>
  delete(groupId: string, requesterId: string): Promise<boolean>
  create(name: string, description: string, topics: string[], creatorId: string, isPrivate?: boolean): Promise<GroupResponseDTO>
  update(id: string, userId: string, data: { name?: string, description?: string }): Promise<GroupResponseDTO | null>
  addMember(groupId: string, targetUserId: string, requesterId: string): Promise<boolean>
}

export interface IDuelService {
  create(difficulty: string, wager: number, player1Id: string, player2Id: string): Promise<DuelResponseDTO>
  detail(id: string): Promise<DuelResponseDTO | null>
  updateState(id: string, status: string, winnerId?: string): Promise<DuelResponseDTO | null>
  listOpen(): Promise<DuelResponseDTO[]>
  listActive(playerId: string): Promise<DuelResponseDTO[]>
  listInvites(userId: string): Promise<DuelResponseDTO[]>
  createOpen(difficulty: string, wager: number, playerId: string): Promise<DuelResponseDTO>
  join(id: string, playerId: string): Promise<DuelResponseDTO | null>
  setSummary(id: string, finalOverallStatus: string, finalUserCode: string): Promise<DuelResponseDTO | null>
  finish(id: string, winnerId?: string, finalOverallStatus?: string, finalUserCode?: string): Promise<DuelResponseDTO | null>
  finishDraw(id: string): Promise<DuelResponseDTO | null>
  processSubmission(id: string, userId: string, userCode: string, result: SubmissionResult): Promise<DuelResponseDTO | null>
  cancel(id: string, playerId: string): Promise<DuelResponseDTO | null>
  forfeit(id: string, playerId: string): Promise<DuelResponseDTO | null>
  reportWarning(duelId: string, userId: string, reason?: 'visibility' | 'paste'): Promise<{ duel: DuelResponseDTO | null, disqualified: boolean }>
}

export interface IWalletService {
  get(userId: string): Promise<WalletResponseDTO | null>
  createDepositOrder(userId: string, amount: number): Promise<any>
  verifyDeposit(userId: string, orderId: string, paymentId: string, signature: string): Promise<boolean>

  withdraw(userId: string, amount: number, vpa: string, name?: string, email?: string, phone?: string): Promise<boolean>
  wager(userId: string, amount: number, description: string): Promise<void>
  win(userId: string, amount: number, description: string): Promise<void>
  getTransactions(userId: string, page: number, limit: number, type?: string, startDate?: string, endDate?: string): Promise<{ transactions: TransactionResponseDTO[], total: number, page: number, totalPages: number }>
}

export interface IAdminService {
  dashboardStats(): Promise<{ totalUsers: number, activeDuels: number, totalProblems: number, totalRevenue: number, pendingProblems: number, pendingPayouts: number, pendingAntiCheat: number }>
  financials(page?: number, limit?: number): Promise<{ totalDuelWagered: number, totalDuelCommissions: number, totalDuelsWithWagers: number, totalSubscriptionRevenue: number, totalPlatformRevenue: number, commissionsByDay: any[], recentCommissions: any[], total: number, page: number, totalPages: number }>
  pendingProblems(page?: number, limit?: number): Promise<{ problems: ProblemResponseDTO[], total: number, page: number, totalPages: number }>
  approveProblem(id: string): Promise<boolean>
  rejectProblem(id: string): Promise<boolean>
  allProblems(page?: number, limit?: number): Promise<{ problems: ProblemResponseDTO[], total: number, page: number, totalPages: number }>
  validateProblemTests(id: string): Promise<any>
  addProblemTestCases(id: string, newTestCases: any[]): Promise<boolean>
  allUsers(page?: number, limit?: number, query?: string): Promise<{ users: UserResponseDTO[], total: number, page: number, totalPages: number }>
  banUser(id: string): Promise<boolean>
  unbanUser(id: string): Promise<boolean>
  searchUsers(query: string): Promise<UserResponseDTO[]>
  flaggedActivities(page?: number, limit?: number): Promise<{ data: { user: UserResponseDTO, totalWarnings: number, lastOffense: string, breakdown: { paste: number, visibility: number } }[], total: number, page: number, totalPages: number }>
  monitoredDuels(page?: number, limit?: number): Promise<{ duels: DuelResponseDTO[], total: number, page: number, totalPages: number }>
  cancelDuel(id: string): Promise<boolean>
  subscriptionData(page?: number, limit?: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', query?: string }): Promise<{ plans: SubscriptionPlanResponseDTO[], logs: SubscriptionLogResponseDTO[], total: number, page: number, totalPages: number }>
  createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlanResponseDTO>
  updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlanResponseDTO | null>
  deletePlan(id: string): Promise<boolean>
  grantSubscription(username: string, planId: string): Promise<boolean>
  cancelSubscription(userId: string): Promise<boolean>
  getUserWallet(userId: string): Promise<{ balance: number, currency: string }>
  getAllTransactions(page?: number, limit?: number, options?: { status?: string, type?: string, sort?: string, query?: string }): Promise<{ transactions: TransactionResponseDTO[], total: number, page: number, totalPages: number }>
  adjustUserBalance(userId: string, amount: number, description: string): Promise<boolean>
  approvePayout(transactionId: string): Promise<boolean>
  rejectPayout(transactionId: string, reason?: string): Promise<boolean>
}


export interface IChatService {
  getMessages(groupId: string): Promise<ChatMessageResponseDTO[]>
  sendMessage(groupId: string, userId: string, text: string): Promise<ChatMessageResponseDTO>
}

export interface IJudgeService {
  execute(problemId: string, userCode: string, language: string, customInputs?: string[]): Promise<SubmissionResult>
  executeScratchpad(userCode: string, language: string): Promise<SubmissionResult>
}

export interface ProblemListParams {
  query?: string;
  sort?: string;
  difficulty?: string;
  tags?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IProblemService {
  list(params?: ProblemListParams): Promise<PaginatedResponse<ProblemResponseDTO>>
  daily(): Promise<ProblemResponseDTO | undefined>
  create(data: Partial<Problem>): Promise<ProblemResponseDTO>
  update(id: string, data: Partial<Problem>): Promise<ProblemResponseDTO | null>
  generate(difficulty: string, topic: string): Promise<ProblemResponseDTO>
}

export interface IAiService {
  hint(problemId: string, userCode: string): Promise<string>
  codeReview(problemId: string, userCode: string): Promise<string>
  performance(userId: string): Promise<string>
  generateProblem(difficulty: string, topic: string): Promise<ProblemResponseDTO>
  complexity(userCode: string): Promise<string>
  optimize(problemId: string, userCode: string): Promise<string>
  edgeCases(problemId: string, userCode: string): Promise<string>
  validateTestCases(problem: Problem, solutionCode: string): Promise<string>
}

export interface IStudySessionService {
  create(data: { groupId: string, userId: string, title: string, description: string, mode: string, startTime: string, durationMinutes: number, problems: string[] }): Promise<StudySessionResponseDTO>
  update(sessionId: string, userId: string, data: Partial<StudySession>): Promise<StudySessionResponseDTO | null>
  join(sessionId: string, userId: string): Promise<StudySessionResponseDTO | null>
  leave(sessionId: string, userId: string): Promise<StudySessionResponseDTO | null>
  passTurn(sessionId: string, userId: string): Promise<StudySessionResponseDTO | null>
  list(groupId: string, page?: number, limit?: number, options?: { status?: string, sort?: string, query?: string }): Promise<{ sessions: StudySessionResponseDTO[], total: number, page: number, totalPages: number }>
  getById(id: string): Promise<StudySessionResponseDTO | null>
  getByIdSecure(id: string, userId: string): Promise<StudySessionResponseDTO | null>
}

export interface ISubmissionService {
  createSubmission(userId: string, problemId: string, code: string, language: string, result: SubmissionResult): Promise<SubmissionResponseDTO>
  getUserSubmissions(userId: string): Promise<SubmissionResponseDTO[]>
  getSolvedProblemIds(userId: string): Promise<string[]>
}

export interface ISubscriptionService {
  getPlans(): Promise<SubscriptionPlanResponseDTO[]>
  subscribe(userId: string, planId: string): Promise<{ success: boolean, action?: string, expiry?: Date, message?: string }>
  cancel(userId: string): Promise<{ success: boolean, message?: string }>
  resume(userId: string): Promise<{ success: boolean, message?: string }>
  history(userId: string, page: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ logs: SubscriptionLogResponseDTO[], total: number, page: number, totalPages: number }>
}
