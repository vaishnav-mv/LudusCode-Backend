import { User, Group, Problem, Duel, Competition, Submission, Wallet, StudySession } from '../types';

export interface IBaseRepository<T> {
    all(skip?: number, limit?: number, filter?: any, sort?: any): Promise<T[]>;
    count(filter?: any): Promise<number>;
    getById(id: string): Promise<T | undefined>;
    create(item: Partial<T> | any): Promise<T>;
    update(id: string, partial: Partial<T>): Promise<T | undefined>;
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
    attemptJoin(id: string, player2Data: any): Promise<Duel | null>;
}

export interface ICompetitionRepository extends IBaseRepository<Competition> {
    forGroup(groupId: string): Promise<Competition[]>;
}

export interface ISubmissionRepository {
    create(data: any): Promise<any>;
    findByUser(userId: string, limit?: number): Promise<any[]>;
    getSolvedProblemIds(userId: string): Promise<string[]>;
}

export interface IStudySessionRepository extends IBaseRepository<StudySession> {
    listByGroup(groupId: string, skip: number, limit: number, options: { status?: string, sort?: string, q?: string }): Promise<StudySession[]>;
    findActiveRoundRobin(): Promise<StudySession[]>;
}

export interface IWalletRepository {
    get(userId: string): Promise<Wallet>;
    deposit(userId: string, amount: number, description: string): Promise<void>;
    withdraw(userId: string, amount: number, description: string): Promise<boolean>;
    add(userId: string, amount: number, description: string): Promise<void>;
}

export interface IChatRepository {
    getByGroup(groupId: string): Promise<any[]>;
    add(groupId: string, userId: string, text: string, timestamp: string): Promise<any>;
}
