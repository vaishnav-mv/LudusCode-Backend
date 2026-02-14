import { User, Group, Problem, Duel, DuelPlayer, Competition, ProblemSubmission, Wallet, StudySession, ChatMessage } from '../types';

export interface IBaseRepository<T> {
    all(skip?: number, limit?: number, filter?: any, sort?: any): Promise<T[]>;
    count(filter?: any): Promise<number>;
    getById(id: string): Promise<T | undefined>;
    create(item: Partial<T>): Promise<T>;
    update(id: string, partial: any): Promise<T | undefined>;
    delete(id: string): Promise<boolean>;
}

export interface IUserRepository extends IBaseRepository<User> {
    getByEmail(email: string): Promise<User | undefined>;
    getByUsername(username: string): Promise<User | undefined>;
    leaderboard(skip?: number, limit?: number): Promise<User[]>;
    search(query: string): Promise<User[]>;
    getRank(elo: number): Promise<number>;
}

export interface IGroupRepository extends IBaseRepository<Group> {
    findByName(name: string): Promise<Group | undefined>;
}

export interface IProblemRepository extends IBaseRepository<Problem> {
    pending(): Promise<Problem[]>;
}

export interface IDuelRepository extends IBaseRepository<Duel> {
    attemptJoin(id: string, player2Data: Partial<DuelPlayer>): Promise<Duel | null>;
    attemptFinish(id: string, winner: any, finalStatus: string): Promise<Duel | null>;
    attemptCancel(id: string): Promise<Duel | null>;
}

export interface ICompetitionRepository extends IBaseRepository<Competition> {
    forGroup(groupId: string): Promise<Competition[]>;
}

export interface ISubmissionRepository {
    create(data: Partial<ProblemSubmission>): Promise<ProblemSubmission>;
    findByUser(userId: string, limit?: number): Promise<ProblemSubmission[]>;
    getSolvedProblemIds(userId: string): Promise<string[]>;
}

export interface IStudySessionRepository extends IBaseRepository<StudySession> {
    listByGroup(groupId: string, skip: number, limit: number, options: { status?: string, sort?: string, q?: string }): Promise<{ sessions: StudySession[], total: number }>;
    findActiveRoundRobin(): Promise<StudySession[]>;
}

export interface IWalletRepository {
    get(userId: string): Promise<Wallet>;
    deposit(userId: string, amount: number, description: string): Promise<void>;
    withdraw(userId: string, amount: number, description: string): Promise<boolean>;
    add(userId: string, amount: number, description: string): Promise<void>;
}

export interface IChatRepository {
    getByGroup(groupId: string): Promise<ChatMessage[]>;
    add(groupId: string, userId: string, text: string, timestamp: string): Promise<ChatMessage>;
}
