import { User, Group, Problem, Duel, DuelPlayer, ProblemSubmission, Wallet, StudySession, ChatMessage, Transaction, SubscriptionPlan, SubscriptionLog } from '../types';

export interface IBaseRepository<T> {
    all(skip?: number, limit?: number, filter?: Record<string, unknown>, sort?: Record<string, unknown> | string): Promise<T[]>;
    count(filter?: Record<string, unknown>): Promise<number>;
    getById(id: string): Promise<T | undefined>;
    create(item: Partial<T>): Promise<T>;
    update(id: string, partial: Record<string, unknown>): Promise<T | undefined>;
    delete(id: string): Promise<boolean>;
}

export interface IUserRepository extends IBaseRepository<User> {
    getByEmail(email: string): Promise<User | undefined>;
    getByUsername(username: string): Promise<User | undefined>;
    leaderboard(skip?: number, limit?: number): Promise<{ users: User[], total: number }>;
    search(query: string): Promise<User[]>;
    getRank(elo: number): Promise<number>;
    findExpiredPremiumUsers(date: Date): Promise<User[]>;
}

export interface IGroupRepository extends IBaseRepository<Group> {
    findByName(name: string): Promise<Group | undefined>;
    removeMemberFromAll(userId: string): Promise<void>;
    transferOrDeleteOwnedGroups(userId: string): Promise<void>;
}

export interface IProblemRepository extends IBaseRepository<Problem> {
}

export interface IDuelRepository extends IBaseRepository<Duel> {
    attemptJoin(id: string, player2Data: Partial<DuelPlayer>): Promise<Duel | null>;
    attemptFinish(id: string, winner: User | string | null, finalStatus: string): Promise<Duel | null>;
    attemptCancel(id: string): Promise<Duel | null>;
    countRecentDuels(userId: string, since: Date): Promise<number>;
    getCommissionStats(startDate?: Date, endDate?: Date): Promise<{ totalWagered: number, totalCommissions: number, totalDuelsWithWagers: number }>;
    getRecentCommissions(page: number, limit: number, options?: { query?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', startDate?: Date, endDate?: Date }): Promise<{ recent: { duelId: string, problemTitle: string, winnerName: string, wager: number, commission: number, timestamp: number }[], total: number }>;
    getCommissionsByDay(startDate?: Date, endDate?: Date, groupBy?: 'day' | 'month' | 'year'): Promise<{ date: string, amount: number }[]>;
    getFlaggedActivities(page: number, limit: number): Promise<{ data: { user: unknown, totalWarnings: number, lastOffense: string, breakdown: { paste: number, visibility: number } }[], total: number }>;
}

export interface ISubmissionRepository {
    create(data: Partial<ProblemSubmission>): Promise<ProblemSubmission>;
    findByUser(userId: string, limit?: number): Promise<ProblemSubmission[]>;
    getSolvedProblemIds(userId: string): Promise<string[]>;
}

export interface IStudySessionRepository extends IBaseRepository<StudySession> {
    listByGroup(groupId: string, skip: number, limit: number, options: { status?: string, sort?: string, query?: string }): Promise<{ sessions: StudySession[], total: number }>;
    findActiveRoundRobin(): Promise<StudySession[]>;
}

export interface IWalletRepository {
    get(userId: string): Promise<Wallet>;
    deposit(userId: string, amount: number, description: string): Promise<void>;
    withdraw(userId: string, amount: number, description: string, type?: string, status?: string): Promise<boolean>;
    add(userId: string, amount: number, description: string): Promise<void>;
    getTransactions(userId: string, skip: number, limit: number, type?: string, startDate?: string, endDate?: string): Promise<{ transactions: Transaction[], total: number }>;
    getAllTransactions(skip: number, limit: number, options?: { status?: string, type?: string, sort?: string, query?: string }): Promise<{ transactions: Transaction[], total: number }>;
    updateTransactionStatus(id: string, status: string): Promise<boolean>;
    getTransactionById(id: string): Promise<Transaction | null>;
}

export interface ISubscriptionRepository {
    getPlans(): Promise<SubscriptionPlan[]>;
    getAllPlansAdmin(): Promise<SubscriptionPlan[]>;
    getPlanById(id: string): Promise<SubscriptionPlan | null>;
    createPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
    updatePlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null>;
    deletePlan(id: string): Promise<boolean>;
    createLog(data: Partial<SubscriptionLog>): Promise<SubscriptionLog>;
    getLogsByUser(userId: string, skip: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc' }): Promise<{ logs: SubscriptionLog[], total: number }>;
    getLogsAll(skip: number, limit: number, options?: { action?: string, sortStr?: string, sortOrder?: 'asc' | 'desc', query?: string, isRevenue?: boolean, startDate?: Date, endDate?: Date }): Promise<{ logs: SubscriptionLog[], total: number }>;
    getTotalSubscriptionRevenue(startDate?: Date, endDate?: Date): Promise<number>;
    getRevenueByDay(startDate?: Date, endDate?: Date, groupBy?: 'day' | 'month' | 'year'): Promise<{ date: string, amount: number }[]>;
}


export interface IChatRepository {
    getByGroup(groupId: string): Promise<ChatMessage[]>;
    add(groupId: string, userId: string, text: string, timestamp: string): Promise<ChatMessage>;
}

export interface IAiRepository {
    hint(problem: Problem, userCode: string): Promise<string>
    codeReview(problem: Problem, userCode: string): Promise<string>
    performance(data: { user: User, submissionStats: { total: number, accepted: number, acceptanceRate: number }, joinedGroups: Group[] }): Promise<string>

    explainConcept(concept: string): Promise<string>
    summarizeDiscussion(messages: string[]): Promise<string>
    generateProblem(difficulty: string, topic: string): Promise<Problem>
}


export interface IEmailRepository {
    sendOtp(email: string, code: string): Promise<boolean>
}

export interface ICloudinaryRepository {
    uploadImage(filePath: string, folder?: string): Promise<string>
}

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    code: number | null;
    error?: string;
    timedOut?: boolean;
    executionTimeMs?: number;
    memoryKB?: number;
}

export interface ICodeExecutionRepository {
    execute(language: string, code: string, timeoutMs?: number): Promise<ExecutionResult>
}
