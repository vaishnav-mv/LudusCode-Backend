import { User, Group, Competition, CompetitionProblem, SubmissionResult, Duel, Wallet, Problem } from '../types'

export interface IAuthService {
  login(email: string, password: string): Promise<{ user: User, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  adminLogin(email: string, password: string): Promise<{ user: User, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  register(username: string, email: string, password: string): Promise<{ id: string }>
  verifyOtp(email: string, code: string): Promise<any>
  resendVerificationOtp(email: string): Promise<boolean>
  refresh(refreshToken: string): Promise<{ access: string }>
  forgotPassword(email: string): Promise<boolean>
  resetPassword(email: string, code: string, newPassword: string): Promise<boolean>
}

export interface ISocialAuthService {
  getGoogleAuthUrl(): string
  handleGoogleCallback(code: string): Promise<{ user: User, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
  getGithubAuthUrl(): string
  handleGithubCallback(code: string): Promise<{ user: User, tokens: { access: string, refresh: string }, cookie: { domain: string, secure: boolean } }>
}

export interface IUserService {
  profile(id: string): Promise<any>
  setPremium(id: string): Promise<User | null>
  leaderboard(): Promise<User[]>
  updateProfile(id: string, data: any): Promise<User | null>
  changePassword(id: string, oldPass: string, newPass: string): Promise<void>
  search(query: string): Promise<User[]>
}


import { GroupResponseDTO } from '../dto/response/group.response.dto'

export interface IGroupService {
  list(userId?: string, params?: any): Promise<GroupResponseDTO[]>
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

export interface ICompetitionService {
  forGroup(groupId: string, params?: any): Promise<Competition[]>
  create(data: { groupId: string, title: string, startTime: string, durationMinutes: number, problems: CompetitionProblem[] }): Promise<Competition>
  detail(id: string, currentUserId?: string): Promise<Competition | undefined>
  submit(competitionId: string, userId: string, cp: CompetitionProblem, code: string): Promise<SubmissionResult>
  hint(competitionId: string, userId: string, problemId: string, code: string): Promise<string>
}

export interface IDuelService {
  create(difficulty: any, wager: number, player1Id: string, player2Id: string): Promise<Duel>
  detail(id: string): Promise<Duel | undefined>
  updateState(id: string, status: any, winnerId?: string): Promise<Duel | undefined>
  listOpen(): Promise<Duel[]>
  listActive(playerId: string): Promise<Duel[]>
  createOpen(difficulty: any, wager: number, playerId: string): Promise<Duel>
  join(id: string, playerId: string): Promise<Duel | undefined>
  setSummary(id: string, finalOverallStatus: string, finalUserCode: string): Promise<Duel | undefined>
  finish(id: string, winnerId?: string, finalOverallStatus?: string, finalUserCode?: string): Promise<Duel | undefined>
  submitResult(id: string, playerId: string, result: any, userCode: string): Promise<Duel | undefined>
  cancel(id: string, playerId: string): Promise<Duel | undefined>
}

export interface IWalletService {
  get(userId: string): Promise<Wallet>
  deposit(userId: string, amount: number): Promise<void>
  withdraw(userId: string, amount: number): Promise<boolean>
  wager(userId: string, amount: number, description: string): Promise<void>
  win(userId: string, amount: number, description: string): Promise<void>
}

export interface IAdminService {
  dashboardStats(): Promise<{ totalUsers: number, activeDuels: number, totalProblems: number, totalRevenue: number }>
  financials(): Promise<any>
  pendingProblems(): Promise<Problem[]>
  approveProblem(id: string): Promise<boolean>
  rejectProblem(id: string): Promise<boolean>
  allProblems(page?: number, limit?: number): Promise<{ problems: Problem[], total: number, page: number, totalPages: number }>
  allUsers(page?: number, limit?: number): Promise<{ users: User[], total: number, page: number, totalPages: number }>
  banUser(id: string): Promise<boolean>
  unbanUser(id: string): Promise<boolean>
  flaggedActivities(): Promise<any[]>
  clearFlags(userId: string): Promise<boolean>
  monitoredDuels(): Promise<Duel[]>
  cancelDuel(id: string): Promise<boolean>
  forceDuelResult(id: string, winnerId: string): Promise<boolean>
  subscriptionData(): Promise<{ plans: any[], logs: any[] }>
}


export interface IChatService {
  getMessages(groupId: string): Promise<any[]>
  sendMessage(groupId: string, userId: string, text: string): Promise<any>
}

export interface IJudgeService {
  execute(userCode: string, solutionCode: string, testCases: any[], problem?: any, language?: string): Promise<SubmissionResult>
  executeScratchpad(userCode: string, language: string): Promise<SubmissionResult>
}

export interface IProblemService {
  list(params?: any): Promise<Problem[]>
  daily(): Promise<Problem | undefined>
  create(data: any): Promise<Problem>
  generate(difficulty: string, topic: string): Promise<any>
}

export interface IAiService {
  hint(problem: any, userCode: string): Promise<string>
  codeReview(problem: any, userCode: string): Promise<string>
  performance(profile: any): Promise<string>

  explainConcept(concept: string): Promise<string>
  summarizeDiscussion(messages: string[]): Promise<string>
  generateProblem(difficulty: string, topic: string): Promise<any>
}

export interface IJwtService {
  signAccess(payload: object): string
  signRefresh(payload: object): string
  verify(token: string): any
}

export interface IOtpService {
  create(email: string, purpose: string): Promise<string>
  verify(email: string, code: string, purpose: string): Promise<boolean>
}

export interface IEmailService {
  sendOtp(email: string, code: string): Promise<boolean>
}

export interface ICloudinaryService {
  uploadImage(filePath: string, folder?: string): Promise<string>
}

export interface IStudySessionService {
  create(data: { groupId: string, userId: string, title: string, description: string, mode: string, startTime: string, durationMinutes: number, problems: string[] }): Promise<any>
  update(sessionId: string, userId: string, data: any): Promise<any>
  join(sessionId: string, userId: string): Promise<any>
  leave(sessionId: string, userId: string): Promise<any>
  passTurn(sessionId: string, userId: string): Promise<any>
  list(groupId: string, page?: number, limit?: number, options?: { status?: string, sort?: string, q?: string }): Promise<any>
  getById(id: string): Promise<any>
  getByIdSecure(id: string, userId: string): Promise<any>
}

export interface ISubmissionService {
  createSubmission(userId: string, problemId: string, code: string, language: string, result: any): Promise<any>
  getUserSubmissions(userId: string): Promise<any[]>
  getSolvedProblemIds(userId: string): Promise<string[]>
}

export interface ISubscriptionService {
  getPlans(): Promise<any[]>
  subscribe(userId: string, planId: string): Promise<{ success: boolean, action?: string, expiry?: Date, message?: string }>
}
