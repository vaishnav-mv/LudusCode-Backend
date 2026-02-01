
export enum DuelStatus {
    Waiting = 'Waiting',
    InProgress = 'In Progress',
    Finished = 'Finished',
    Cancelled = 'Cancelled'
}

export enum Difficulty {
    Easy = 'Easy',
    Medium = 'Medium',
    Hard = 'Hard'
}

export enum SubmissionStatus {
    Accepted = 'Accepted',
    WrongAnswer = 'Wrong Answer',
    TimeLimitExceeded = 'Time Limit Exceeded',
    RuntimeError = 'Runtime Error',
    Disqualified = 'Disqualified'
}

export enum StudySessionMode {
    Collaborative = 'collaborative',
    RoundRobin = 'round_robin'
}

export enum StudySessionStatus {
    Upcoming = 'upcoming',
    Active = 'active',
    Completed = 'completed'
}

export enum TransactionType {
    Deposit = 'Deposit',
    Withdrawal = 'Withdrawal',
    DuelWager = 'Duel Wager',
    DuelWin = 'Duel Win',
}

export enum TransactionStatus {
    Completed = 'Completed',
    Pending = 'Pending',
    Failed = 'Failed',
}

export enum CompetitionStatus {
    Upcoming = 'Upcoming',
    Active = 'Active',
    Completed = 'Completed'
}

export enum ParticipantProblemStatus {
    Solved = 'Solved',
    Attempted = 'Attempted',
    Unsolved = 'Unsolved'
}



export enum ProblemStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Custom = 'Custom' // or Rejected? Model said Pending, Approved, Custom
}

export interface User {
    _id?: string;
    username: string;
    email: string;
    avatarUrl?: string; // in sample
    isAdmin: boolean;
    elo: number;
    duelsWon: number;
    duelsLost: number;
    leaderboardRank?: number; // in sample "Diamond Coder"
    isBanned?: boolean;
    isPremium?: boolean;
    isVerified?: boolean;
    currentPlanId?: string;
    subscriptionExpiry?: Date | string;
    legacyId?: string;
    passwordHash?: string; // in sample
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface SubscriptionPlan {
    _id?: string;
    name: string;
    price: number;
    period: string; // 'monthly'
    features: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface SubscriptionLog {
    _id?: string;
    userId: string | User;
    planId: string | SubscriptionPlan;
    action: string;
    amount: number;
    timestamp: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface ChatMessage {
    _id?: string;
    groupId: string;
    user: string | User;
    text: string;
    timestamp: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface TestCase {
    input: string;
    output: string;
    isSample?: boolean;
    _id?: string; // in sample
}

export interface Solution {
    language: string;
    code: string;
    _id?: string;
}

export interface Problem {
    _id?: string;
    title: string;
    description?: string;
    difficulty: Difficulty;
    constraints?: string[];
    inputFormat?: string;
    outputFormat?: string;
    testCases?: TestCase[];
    solutions?: Solution[];
    solution?: Solution;
    starterCode?: string;
    functionName?: string;
    status: 'Pending' | 'Approved' | 'Custom';
    legacyId?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface TestCaseResult {
    testCase: {
        input: string;
        output: string;
        isSample?: boolean;
        _id?: string;
    };
    status: SubmissionStatus | string;
    userOutput: string;
    _id?: string;
}

export interface SubmissionResult {
    overallStatus: SubmissionStatus;
    results: TestCaseResult[];
    executionTime: number;
    memoryUsage: number;
    attempts?: number;
}

export interface Transaction {
    id: string; // Sample HAS 'id' (tx-...) and '_id'
    _id?: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    description: string;
    timestamp: string | Date;
}

// For Duel embedded submissions (uses 'user' field, not 'userId')
export interface Submission {
    _id?: string;
    user: string | User; // Sample uses "user" for embedded duel submissions
    status: SubmissionStatus | string;
    userCode: string;
    executionTime: number;
    memoryUsage: number;
    attempts: number;
    codeHash?: string;
    submittedAt: number;
}

// For separate Submissions collection (the sample 'submissions' has userId, problemId)
export interface ProblemSubmission {
    _id?: string;
    userId: string | User;
    problemId: string | Problem;
    code: string;
    language: string;
    status: SubmissionStatus;
    executionTime: number;
    memoryUsage: number;
    testCaseResults?: TestCaseResult[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface DuelPlayer {
    user: User | string | null;
    warnings: number;
    _id?: string;
}

export interface Duel {
    _id?: string;
    problem: Problem | string;
    player1: DuelPlayer;
    player2: DuelPlayer;
    status: DuelStatus;
    startTime: number;
    winner?: User | string | null;
    wager?: number;
    submissions?: Submission[]; // The sample shows distinct structure, keeping any or generic
    finalOverallStatus?: SubmissionStatus; // from DTO
    finalUserCode?: string; // from DTO
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface Wallet {
    _id?: string;
    userId: string | User;
    balance: number;
    currency: string;
    transactions: Transaction[];
    id?: string;
}

export interface Group {
    _id?: string;
    name: string;
    description?: string;
    isPrivate: boolean;
    topics: string[];
    members: (User | string)[];
    pendingMembers?: (User | string)[];
    blockedMembers?: (User | string)[]; // from DTO
    owner: User | string;
    legacyId?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface StudySession {
    _id?: string;
    groupId: string | Group;
    createdBy: string | User;
    title: string;
    description?: string;
    mode: StudySessionMode;
    status: StudySessionStatus;
    startTime: Date | string;
    durationMinutes: number;
    problems: (string | Problem)[];
    participants: {
        user: User | string;
        joinedAt: Date | string;
        role: 'host' | 'participant' | 'observer';
        _id?: string;
    }[];
    chatEnabled?: boolean;
    voiceEnabled?: boolean;
    currentTurnUserId?: string | User;
    turnStartedAt?: Date | string;
    turnDurationSeconds?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface CompetitionProblem {
    problem: Problem | string;
    points: number;
}

export interface Competition {
    _id?: string;
    groupId: string | Group;
    title: string;
    startTime: Date | string;
    durationMinutes: number;
    problems: CompetitionProblem[];
    participants: {
        user: User | string;
        score: number;
        rank: number;
        problemStatus: Record<string, ParticipantProblemStatus>;
    }[];
    status: CompetitionStatus;
    id?: string;
}
