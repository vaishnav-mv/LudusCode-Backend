import { Types } from 'mongoose';

export const toId = (document: { _id?: Types.ObjectId | string, id?: string } | null | undefined) => ({
    id: document?._id?.toString() || document?.id
});

import { UserResponseDTO } from '../dto/response/user.response.dto';
import { GroupResponseDTO } from '../dto/response/group.response.dto';
import { DuelResponseDTO } from '../dto/response/duel.response.dto';
import { WalletResponseDTO } from '../dto/response/wallet.response.dto';
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto';
import { SubmissionResponseDTO } from '../dto/response/submission.response.dto';
import { ProblemResponseDTO } from '../dto/response/problem.response.dto';
import { TransactionResponseDTO } from '../dto/response/transaction.response.dto';
import { SubscriptionPlanResponseDTO, SubscriptionLogResponseDTO } from '../dto/response/subscription.response.dto';
import { StudySessionResponseDTO } from '../dto/response/studySession.response.dto';
import { User, Problem, Group, Wallet, ChatMessage, Duel, ProblemSubmission, Difficulty, SubmissionStatus, ProblemStatus, StudySession, StudySessionMode, StudySessionStatus, SubscriptionPlan, SubscriptionLog, Transaction, TransactionType, TransactionStatus } from '../types';

export const mapTransaction = (t: Partial<Transaction> | null | undefined): TransactionResponseDTO | null => {
    if (!t) return null;
    return {
        id: t._id?.toString() || t.id || '',
        userId: (typeof t.userId === 'object' && t.userId !== null && 'username' in t.userId)
            ? { id: (t.userId as any)._id?.toString() || (t.userId as any).id, username: (t.userId as any).username, email: (t.userId as any).email }
            : ((typeof t.userId === 'object' && t.userId && '_id' in t.userId) ? (t.userId as { _id: { toString: () => string } })._id?.toString() : (t.userId as string) || ''),
        type: t.type as TransactionType,
        status: t.status as TransactionStatus,
        amount: t.amount || 0,
        description: t.description || '',
        timestamp: (t.timestamp instanceof Date ? t.timestamp.toISOString() : (t.timestamp as string)) || new Date().toISOString()
    };
};

export const mapStudySession = (session: Partial<StudySession> | null | undefined): StudySessionResponseDTO | null => {
    if (!session) return null;
    return {
        id: session._id?.toString() || session.id || '',
        groupId: (typeof session.groupId === 'object' && session.groupId && '_id' in session.groupId) ? (session.groupId as { _id: { toString: () => string } })._id?.toString() : (session.groupId as string) || '',
        title: session.title || '',
        description: session.description || '',
        mode: session.mode as StudySessionMode,
        status: session.status as StudySessionStatus,
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : (session.startTime || ''),
        durationMinutes: session.durationMinutes || 0,
        problems: (session.problems || []).map(problem => typeof problem === 'string' ? problem : (problem._id?.toString() || problem.id || '')),
        participants: (session.participants || []).map(participant => ({
            user: (typeof participant.user === 'object' && participant.user && '_id' in participant.user) ? mapUser(participant.user as Partial<User>)! : (participant.user as string),
            joinedAt: participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : (participant.joinedAt || ''),
            role: participant.role || 'participant'
        })),
        chatEnabled: !!session.chatEnabled,
        voiceEnabled: !!session.voiceEnabled,
        currentTurnUserId: (typeof session.currentTurnUserId === 'object' && session.currentTurnUserId && '_id' in session.currentTurnUserId) ? (session.currentTurnUserId as { _id: { toString: () => string } })._id?.toString() : (session.currentTurnUserId as string) || undefined,
        turnStartedAt: session.turnStartedAt instanceof Date ? session.turnStartedAt.toISOString() : session.turnStartedAt,
        turnDurationSeconds: session.turnDurationSeconds
    };
};

export const mapSubscriptionPlan = (plan: Partial<SubscriptionPlan> | null | undefined): SubscriptionPlanResponseDTO | null => {
    if (!plan) return null;
    return {
        id: plan._id?.toString() || plan.id || '',
        name: plan.name || '',
        price: plan.price || 0,
        period: plan.period || 'monthly',
        maxDailyDuels: plan.maxDailyDuels,
        features: plan.features || [],
        isActive: plan.isActive !== undefined ? plan.isActive : true
    };
};

export const mapSubscriptionLog = (log: Partial<SubscriptionLog> | null | undefined): SubscriptionLogResponseDTO | null => {
    if (!log) return null;
    return {
        id: log._id?.toString() || log.id || '',
        userId: (typeof log.userId === 'object' && log.userId && '_id' in log.userId) ? (log.userId as { _id: { toString: () => string } })._id?.toString() : (log.userId as string) || '',
        planId: (typeof log.planId === 'object' && log.planId && '_id' in log.planId) ? (mapSubscriptionPlan(log.planId as Partial<SubscriptionPlan>) || '') : (log.planId as string) || '',
        action: log.action || '',
        amount: log.amount || 0,
        expiryDate: log.expiryDate instanceof Date ? log.expiryDate.toISOString() : (log.expiryDate || ''),
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : (log.timestamp || '')
    };
};

export const mapUser = (user: Partial<User> | null | undefined, leaderboardRank?: number, premiumFeatures?: string[]): UserResponseDTO | null => {
    if (!user) return null;
    return {
        id: user._id?.toString() || user.id || '',
        username: user.username || '',
        avatarUrl: user.avatarUrl || '',
        leaderboardRank: leaderboardRank ?? user.leaderboardRank,
        elo: user.elo || 1200,
        duelsWon: user.duelsWon || 0,
        duelsLost: user.duelsLost || 0,
        isAdmin: !!user.isAdmin,
        isBanned: !!user.isBanned,
        isPremium: !!user.isPremium,
        hasPassword: !!user.passwordHash,
        premiumFeatures: premiumFeatures || user.premiumFeatures || [],
        currentPlanId: user.currentPlanId ? user.currentPlanId.toString() : undefined,
        subscriptionExpiry: user.subscriptionExpiry,
        cancelAtPeriodEnd: !!user.cancelAtPeriodEnd,
        pendingPlanId: user.pendingPlanId ? user.pendingPlanId.toString() : undefined,
        failedRenewalPlanId: user.failedRenewalPlanId ? user.failedRenewalPlanId.toString() : undefined
    };
};

export const mapProblem = (problem: Partial<Problem> | null | undefined): ProblemResponseDTO | null => {
    if (!problem) return null;
    return {
        id: problem._id?.toString() || problem.id || '',
        title: problem.title || '',
        description: problem.description || '',
        difficulty: problem.difficulty || Difficulty.Easy,
        constraints: problem.constraints || [],
        tags: problem.tags || [],
        inputFormat: problem.inputFormat || '',
        outputFormat: problem.outputFormat || '',
        inputSchema: problem.inputSchema || [],
        outputSchema: problem.outputSchema || [],
        testCases: problem.testCases || [],
        solutions: problem.solutions,
        starterCode: problem.starterCode,
        functionName: problem.functionName,
        editorial: problem.editorial,
        timeLimitMs: problem.timeLimitMs || 5000,
        status: problem.status || ProblemStatus.Pending
    };
};

export const mapDuelProblem = (problem: Partial<Problem> | null | undefined, showSecrets = false): ProblemResponseDTO | null => {
    if (!problem) return null;
    return {
        id: problem._id?.toString() || problem.id || '',
        title: problem.title || '',
        description: problem.description || '',
        difficulty: problem.difficulty || Difficulty.Easy,
        constraints: problem.constraints || [],
        tags: problem.tags || [],
        inputFormat: problem.inputFormat || '',
        outputFormat: problem.outputFormat || '',
        inputSchema: problem.inputSchema || [],
        outputSchema: problem.outputSchema || [],
        testCases: problem.testCases || [],
        solutions: showSecrets ? problem.solutions : [], // Hide all solutions in active duel context
        editorial: showSecrets ? problem.editorial : undefined,
        starterCode: problem.starterCode,
        functionName: problem.functionName,
        status: problem.status || ProblemStatus.Pending,
        timeLimitMs: problem.timeLimitMs || 5000
    };
};

export const mapGroup = (group: Partial<Group> | null | undefined): GroupResponseDTO | null => {
    if (!group) return null;
    return {
        id: group._id?.toString() || group.id || '',
        name: group.name || '',
        description: group.description || '',
        isPrivate: !!group.isPrivate,
        topics: group.topics || [],
        members: (group.members || []).map((member) => mapUser(member as Partial<User>)).filter((user): user is UserResponseDTO => user !== null),
        pendingMembers: (group.pendingMembers || []).map((member) => mapUser(member as Partial<User>)).filter((user): user is UserResponseDTO => user !== null),
        blockedMembers: (group.blockedMembers || []).map((member) => mapUser(member as Partial<User>)).filter((user): user is UserResponseDTO => user !== null),
        ownerId: (typeof group.owner === 'object' && group.owner && '_id' in group.owner) ? (group.owner as { _id: { toString: () => string } })._id?.toString() : (group.owner as string) || ''
    };
};

export const mapWallet = (wallet: Partial<Wallet> | null | undefined): WalletResponseDTO | null => {
    if (!wallet) return null;
    return {
        userId: (typeof wallet.userId === 'object' && wallet.userId && '_id' in wallet.userId) ? (wallet.userId as { _id: { toString: () => string } })._id?.toString() : (wallet.userId as string) || '',
        balance: wallet.balance || 0,
        currency: wallet.currency || 'INR',
        transactions: (wallet.transactions || []).map(transaction => mapTransaction(transaction)).filter(transaction => transaction !== null)
    };
};

export const mapMessage = (message: Partial<ChatMessage> | null | undefined): ChatMessageResponseDTO | null => {
    if (!message) return null;
    return {
        id: message.id || message._id?.toString() || '',
        user: mapUser(message.user as Partial<User>)!,
        text: message.text || '',
        timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp || ''
    };
};

export const mapDuel = (duel: Partial<Duel> | null | undefined): DuelResponseDTO | null => {
    if (!duel) return null;
    return {
        id: duel._id?.toString() || duel.id || '',
        problem: mapDuelProblem(duel.problem as Partial<Problem>, duel.status === 'Finished')!,
        player1: { user: mapUser(duel.player1?.user as Partial<User>), warnings: duel.player1?.warnings || 0 },
        player2: { user: mapUser(duel.player2?.user as Partial<User>), warnings: duel.player2?.warnings || 0 },
        status: duel.status || 'Waiting',
        startTime: duel.startTime || 0,
        winner: mapUser(duel.winner as Partial<User>),
        wager: duel.wager,
        finalOverallStatus: duel.finalOverallStatus,
        finalUserCode: duel.finalUserCode,
        submissions: (duel.submissions || []).map(submission => ({
            id: submission._id?.toString() || '',
            user: (typeof submission.user === 'object' && submission.user && '_id' in submission.user) ? mapUser(submission.user as Partial<User>)! : (submission.user as string),
            status: submission.status,
            userCode: submission.userCode,
            executionTime: submission.executionTime,
            memoryUsage: submission.memoryUsage,
            attempts: submission.attempts,
            codeHash: submission.codeHash,
            submittedAt: submission.submittedAt
        }))
    };
};

export const mapSubmission = (submission: Partial<ProblemSubmission> | null | undefined): SubmissionResponseDTO | null => {
    if (!submission) return null;
    return {
        id: submission._id?.toString() || submission.id || '',
        problem: mapProblem(submission.problemId as Partial<Problem>)!,
        userCode: submission.code || '',
        result: {
            overallStatus: submission.status as SubmissionStatus, // Cast or default?
            results: submission.testCaseResults || [],
            executionTime: submission.executionTime || 0,
            memoryUsage: submission.memoryUsage || 0
        },
        submittedAt: submission.createdAt || new Date()
    };
}

