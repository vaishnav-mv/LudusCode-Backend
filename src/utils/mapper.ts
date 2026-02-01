export const toId = (document: any) => ({
    id: document._id?.toString?.() || document.id
});

import { UserResponseDTO } from '../dto/response/user.response.dto';
import { GroupResponseDTO } from '../dto/response/group.response.dto';
import { DuelResponseDTO } from '../dto/response/duel.response.dto';
import { CompetitionResponseDTO } from '../dto/response/competition.response.dto';
import { WalletResponseDTO } from '../dto/response/wallet.response.dto';
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto';

export const mapUser = (user: any, leaderboardRank?: number): UserResponseDTO | null => {
    if (!user) return null;
    return {
        id: user._id?.toString?.() || user.id,
        username: user.username || user.name,
        avatarUrl: user.avatarUrl || '',
        leaderboardRank: leaderboardRank ?? user.leaderboardRank,
        elo: user.elo,
        duelsWon: user.duelsWon,
        duelsLost: user.duelsLost,
        isAdmin: !!user.isAdmin,
        isBanned: !!user.isBanned,
        isPremium: !!user.isPremium,
        hasPassword: !!user.passwordHash
    };
};

export const mapProblem = (problem: any) => ({
    id: problem._id?.toString?.() || problem.id,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    constraints: problem.constraints,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    testCases: problem.testCases,
    solution: problem.solution,
    solutions: problem.solutions,
    starterCode: problem.starterCode,
    functionName: problem.functionName,
    status: problem.status
});

export const mapGroup = (group: any): GroupResponseDTO => ({
    id: group._id?.toString?.() || group.id,
    name: group.name,
    description: group.description,
    isPrivate: !!group.isPrivate,
    topics: group.topics || [],
    members: (group.members || []).map((m: any) => mapUser(m)).filter((user: any) => user !== null),
    pendingMembers: (group.pendingMembers || []).map(mapUser).filter((user: any) => user !== null),
    blockedMembers: (group.blockedMembers || []).map(mapUser).filter((user: any) => user !== null),
    ownerId: group.owner?._id?.toString?.() || group.owner
});

export const mapCompetition = (competition: any): CompetitionResponseDTO => ({
    id: competition._id?.toString?.() || competition.id,
    groupId: competition.groupId?._id?.toString?.() || competition.groupId,
    title: competition.title,
    startTime: competition.startTime,
    durationMinutes: competition.durationMinutes,
    problems: (competition.problems || []).map((problemEntry: any) => ({
        problem: mapProblem(problemEntry.problem) as any,
        points: problemEntry.points
    })),
    participants: (competition.participants || []).map((participant: any) => ({
        user: mapUser(participant.user) as any,
        score: participant.score || 0,
        rank: participant.rank || 0,
        problemStatus: participant.problemStatus || {}
    })),
    status: competition.status
});

export const mapWallet = (wallet: any): WalletResponseDTO => ({
    userId: wallet.userId?._id?.toString?.() || wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
    transactions: wallet.transactions || []
});

export const mapMessage = (message: any): ChatMessageResponseDTO => ({
    id: message.id || message._id?.toString?.(),
    user: mapUser(message.user),
    text: message.text,
    timestamp: message.timestamp
});

export const mapDuel = (duel: any): DuelResponseDTO => ({
    id: duel._id?.toString?.() || duel.id,
    problem: mapProblem(duel.problem) as any,
    player1: { user: mapUser(duel.player1.user), warnings: duel.player1.warnings },
    player2: { user: mapUser(duel.player2.user), warnings: duel.player2.warnings },
    status: duel.status,
    startTime: duel.startTime,
    winner: mapUser(duel.winner),
    wager: duel.wager,
    finalOverallStatus: duel.finalOverallStatus,
    finalUserCode: duel.finalUserCode,
    submissions: duel.submissions
});

