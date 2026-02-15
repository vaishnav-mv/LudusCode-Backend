import { Types } from 'mongoose';

export const toId = (document: { _id?: Types.ObjectId | string, id?: string } | null | undefined) => ({
    id: document?._id?.toString() || document?.id
});

import { UserResponseDTO } from '../dto/response/user.response.dto';
import { GroupResponseDTO } from '../dto/response/group.response.dto';
import { DuelResponseDTO } from '../dto/response/duel.response.dto';
import { CompetitionResponseDTO } from '../dto/response/competition.response.dto';
import { WalletResponseDTO } from '../dto/response/wallet.response.dto';
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto';
import { SubmissionResponseDTO } from '../dto/response/submission.response.dto';
import { User, Problem, Group, Competition, Wallet, ChatMessage, Duel, ProblemSubmission, Difficulty, CompetitionStatus, SubmissionStatus, ProblemStatus } from '../types';

export const mapUser = (user: Partial<User> | null | undefined, leaderboardRank?: number): UserResponseDTO | null => {
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
        hasPassword: !!user.passwordHash
    };
};

export const mapProblem = (problem: Partial<Problem> | null | undefined) => {
    if (!problem) return null;
    return {
        id: problem._id?.toString() || problem.id || '',
        title: problem.title || '',
        description: problem.description || '',
        difficulty: problem.difficulty || Difficulty.Easy,
        constraints: problem.constraints || [],
        inputFormat: problem.inputFormat || '',
        outputFormat: problem.outputFormat || '',
        testCases: problem.testCases || [],
        solution: problem.solution,
        solutions: problem.solutions,
        starterCode: problem.starterCode,
        functionName: problem.functionName,
        status: problem.status || ProblemStatus.Pending
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
        members: (group.members || []).map((member) => mapUser(member as Partial<User>)).filter((u): u is UserResponseDTO => u !== null),
        pendingMembers: (group.pendingMembers || []).map((member) => mapUser(member as Partial<User>)).filter((u): u is UserResponseDTO => u !== null),
        blockedMembers: (group.blockedMembers || []).map((member) => mapUser(member as Partial<User>)).filter((u): u is UserResponseDTO => u !== null),
        ownerId: (typeof group.owner === 'object' && group.owner && '_id' in group.owner) ? (group.owner as { _id: { toString: () => string } })._id?.toString() : (group.owner as string) || ''
    };
};

export const mapCompetition = (competition: Partial<Competition> | null | undefined): CompetitionResponseDTO | null => {
    if (!competition) return null;
    return {
        id: competition._id?.toString() || competition.id || '',
        groupId: (typeof competition.groupId === 'object' && competition.groupId && '_id' in competition.groupId) ? (competition.groupId as { _id: { toString: () => string } })._id?.toString() : (competition.groupId as string) || '',
        title: competition.title || '',
        startTime: competition.startTime instanceof Date ? competition.startTime.toISOString() : (competition.startTime as string) || '',
        durationMinutes: competition.durationMinutes || 0,
        problems: (competition.problems || []).map((problemEntry) => ({
            problem: mapProblem(problemEntry.problem as Partial<Problem>)!,
            points: problemEntry.points
        })),
        participants: (competition.participants || []).map((participant) => ({
            user: mapUser(participant.user as Partial<User>)!,
            score: participant.score || 0,
            rank: participant.rank || 0,
            problemStatus: participant.problemStatus || {}
        })),
        status: competition.status || CompetitionStatus.Upcoming
    };
};

export const mapWallet = (wallet: Partial<Wallet> | null | undefined): WalletResponseDTO | null => {
    if (!wallet) return null;
    return {
        userId: (typeof wallet.userId === 'object' && wallet.userId && '_id' in wallet.userId) ? (wallet.userId as { _id: { toString: () => string } })._id?.toString() : (wallet.userId as string) || '',
        balance: wallet.balance || 0,
        currency: wallet.currency || 'INR',
        transactions: wallet.transactions || []
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
        problem: mapProblem(duel.problem as Partial<Problem>)!,
        player1: { user: mapUser(duel.player1?.user as Partial<User>), warnings: duel.player1?.warnings || 0 },
        player2: { user: mapUser(duel.player2?.user as Partial<User>), warnings: duel.player2?.warnings || 0 },
        status: duel.status || 'Waiting',
        startTime: duel.startTime || 0,
        winner: mapUser(duel.winner as Partial<User>),
        wager: duel.wager,
        finalOverallStatus: duel.finalOverallStatus,
        finalUserCode: duel.finalUserCode,
        submissions: duel.submissions
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

