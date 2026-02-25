
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
    Disqualified = 'Disqualified',
    Forfeit = 'Forfeit'
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
    Subscription = 'Subscription',
}

export enum TransactionStatus {
    Completed = 'Completed',
    Pending = 'Pending',
    Failed = 'Failed',
}







export enum ProblemStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Custom = 'Custom'
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
    passwordHash?: string; // in sample
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
    sub?: string; // for auth context
    premiumFeatures?: string[];
    cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionPlan {
    _id?: string;
    name: string;
    price: number;
    period: string; // 'monthly'
    maxDailyDuels?: number;
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
    expiryDate?: Date | string;
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

// Supported primitive types for problem parameters
export type ParamPrimitiveType = 'integer' | 'float' | 'string' | 'boolean' | 'char';

// Schema for a single parameter (input or output)
export interface ParamSchema {
    name: string;           // e.g. "nums", "target", "result"
    type: ParamPrimitiveType | 'array' | 'matrix' | 'object';
    elementType?: ParamPrimitiveType;  // For array/matrix: type of elements
    properties?: ParamSchema[];       // For object: nested fields
    description?: string;             // Optional human-readable hint
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
    tags?: string[];
    inputFormat?: string;
    outputFormat?: string;
    inputSchema?: ParamSchema[];
    outputSchema?: ParamSchema[];
    testCases?: TestCase[];
    solutions?: Solution[];
    starterCode?: string;
    functionName?: string;
    editorial?: string;
    timeLimitMs?: number;
    status: 'Pending' | 'Approved' | 'Custom';
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
    warningsBreakdown?: {
        paste: number;
        visibility: number;
    };
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
    lastSubmissionResult?: SubmissionResult; // Augmented in submitSolution response
    createdAt?: Date | string;
    updatedAt?: Date | string;
    id?: string;
}

export interface Wallet {
    _id?: string;
    userId: string | User;
    balance: number;
    currency: string;
    transactions?: Transaction[];
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



export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
}
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: User;
            csrfToken(): string;
            cookies: Record<string, string>;
        }
    }
}
export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number | string;
    amount_paid: number | string;
    amount_due: number | string;
    currency: string;
    receipt?: string;
    offer_id: string | null;
    status: string;
    attempts: number;
    notes: unknown[];
    created_at: number;
}

export interface JwtPayload {
    sub?: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}


