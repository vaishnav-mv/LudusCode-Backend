import { singleton, inject } from 'tsyringe'
import { IDuelRepository, IProblemRepository, IUserRepository, IWalletRepository } from '../interfaces/repositories'
import { IDuelService, IJudgeService } from '../interfaces/services'
import { Duel, DuelStatus, Difficulty, SubmissionStatus } from '../types'
import { createHash } from 'crypto'

import { ResponseMessages } from '../constants'

@singleton()
export class DuelService implements IDuelService {
  constructor(
    @inject("IDuelRepository") private _duels: IDuelRepository,
    @inject("IProblemRepository") private _problems: IProblemRepository,
    @inject("IUserRepository") private _users: IUserRepository,
    @inject("IWalletRepository") private _wallets: IWalletRepository,
    @inject("IJudgeService") private _judge: IJudgeService
  ) { }

  async create(difficulty: Difficulty, wager: number, player1Id: string, player2Id: string) {
    const allProblems = await this._problems.all();
    const candidates = allProblems.filter(problem => problem.difficulty === difficulty);
    const problem = candidates[0] || allProblems[0];

    const player1UserId = player1Id;
    const player2UserId = player2Id;

    const player1User = await this._users.getById(player1UserId);
    const player2User = await this._users.getById(player2UserId);

    if (!player1User || !player2User) throw new Error(ResponseMessages.USERS_NOT_FOUND);

    if (wager > 0) {
      await this._wallets.add(player1UserId, -wager, 'Duel wager');
      await this._wallets.add(player2UserId, -wager, 'Duel wager');
    }

    const duel: Duel = {
      id: `duel-${Date.now()}`,
      problem,
      player1: { user: player1User, warnings: 0 },
      player2: { user: player2User, warnings: 0 },
      status: DuelStatus.Waiting,
      startTime: Date.now(),
      winner: null,
      wager
    };

    await this._duels.create(duel);
    return duel;
  }

  async detail(id: string) {
    return this._duels.getById(id);
  }

  async updateState(id: string, status: DuelStatus, winnerId?: string) {
    const duel = await this._duels.getById(id);
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND);

    let winner = duel.winner;
    if (winnerId) {
      const resolvedWinnerId = winnerId;
      const user = await this._users.getById(resolvedWinnerId);
      winner = user || null;

      if (winner && duel.wager && duel.wager > 0) {
        await this._wallets.add((winner as any)._id?.toString?.() || (winner as any).id, duel.wager * 2, 'Duel winnings');
      }
    }

    await this._duels.update(id, { status, winner });
    return this._duels.getById(id);
  }
  async listOpen() {
    const all = await this._duels.all();
    return all.filter(duel => duel.status === DuelStatus.Waiting);
  }
  async listActive(playerId: string) {
    const all = await this._duels.all();
    const resolvedId = playerId;
    console.log('[DuelService.listActive] Checking for:', resolvedId);
    return all.filter(duel => {
      const player1 = (duel.player1.user as any);
      const player2 = (duel.player2.user as any);
      const isParticipant =
        player1?.id === resolvedId || player1?._id?.toString() === resolvedId ||
        player2?.id === resolvedId || player2?._id?.toString() === resolvedId;

      if (duel.status === DuelStatus.InProgress) {
        console.log('[DuelService.listActive] InProgress Duel:', duel.id, 'P1:', player1?._id || player1?.id, 'P2:', player2?._id || player2?.id, 'IsPart:', isParticipant);
      }
      return duel.status === DuelStatus.InProgress && isParticipant;
    });
  }
  async createOpen(difficulty: Difficulty, wager: number, playerId: string) {
    const allProblems = await this._problems.all()
    const candidates = allProblems.filter(problem => problem.difficulty === difficulty)
    const problem = candidates[0] || allProblems[0]

    if (!problem) {
      throw new Error(ResponseMessages.NO_PROBLEMS_AVAILABLE)
    }

    const player1UserId = playerId
    const player1User = await this._users.getById(player1UserId)
    if (!player1User) throw new Error(ResponseMessages.USER_NOT_FOUND)
    if (wager > 0) await this._wallets.add(player1UserId, -wager, 'Duel wager')

    const duelPayload = {
      id: `duel-${Date.now()}`,
      problem: (problem as any)._id || problem.id,
      player1: { user: (player1User as any)._id || player1User.id, warnings: 0 },
      player2: { user: null, warnings: 0 },
      status: DuelStatus.Waiting,
      startTime: Date.now(),
      winner: null,
      wager
    }

    return await this._duels.create(duelPayload)
  }
  async join(id: string, playerId: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)
    if (duel.status !== DuelStatus.Waiting) throw new Error(ResponseMessages.ALREADY_STARTED)
    const player2UserId = playerId

    // Prevent self-join
    const player1Id = (duel.player1.user as any)._id?.toString() || (duel.player1.user as any).id || duel.player1.user;
    if (player1Id.toString() === player2UserId.toString()) {
      throw new Error(ResponseMessages.CANNOT_JOIN_OWN_DUEL);
    }

    const player2User = await this._users.getById(player2UserId)
    if (!player2User) throw new Error(ResponseMessages.USER_NOT_FOUND)
    const wager = duel.wager || 0
    if (wager > 0) await this._wallets.add(player2UserId, -wager, 'Duel wager')
    await this._duels.update(id, { player2: { user: player2User, warnings: 0 }, status: DuelStatus.InProgress, startTime: Date.now() })
    return this._duels.getById(id)
  }
  async setSummary(id: string, finalOverallStatus: string, finalUserCode: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)
    await this._duels.update(id, { finalOverallStatus: finalOverallStatus as SubmissionStatus, finalUserCode })
    return this._duels.getById(id)
  }
  async finish(id: string, winnerId?: string, finalOverallStatus?: string, finalUserCode?: string) {
    const finishedDuel = await this.updateState(id, DuelStatus.Finished, winnerId)
    if (finalOverallStatus || finalUserCode) {
      await this._duels.update(id, { finalOverallStatus: finalOverallStatus as SubmissionStatus, finalUserCode })
    }
    try {
      const duelForElo = await this._duels.getById(id)
      if (duelForElo && duelForElo.winner) {
        const player1Id = (duelForElo as any).player1?.user?._id?.toString?.() || (duelForElo as any).player1?.user?.id
        const player2Id = (duelForElo as any).player2?.user?._id?.toString?.() || (duelForElo as any).player2?.user?.id
        const absoluteWinnerId = (duelForElo as any).winner?._id?.toString?.() || (duelForElo as any).winner?.id
        const absoluteLoserId = absoluteWinnerId === player1Id ? player2Id : player1Id
        const winner = await this._users.getById(absoluteWinnerId)
        const loser = await this._users.getById(absoluteLoserId)
        if (winner && loser) {
          const kFactor = 32
          const expectedWinner = 1 / (1 + Math.pow(10, (((loser as any).elo || 1200) - ((winner as any).elo || 1200)) / 400))
          const expectedLoser = 1 / (1 + Math.pow(10, (((winner as any).elo || 1200) - ((loser as any).elo || 1200)) / 400))
          const newWinnerElo = Math.round(((winner as any).elo || 1200) + kFactor * (1 - expectedWinner))
          const newLoserElo = Math.round(((loser as any).elo || 1200) + kFactor * (0 - expectedLoser))

          await this._users.update(absoluteWinnerId, { elo: newWinnerElo, duelsWon: ((winner as any).duelsWon || 0) + 1 })
          await this._users.update(absoluteLoserId, { elo: newLoserElo, duelsLost: ((loser as any).duelsLost || 0) + 1 })
        }
      }
    } catch { }
    return this._duels.getById(id)
  }
  async submitSolution(id: string, playerId: string, userCode: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)

    // Server-side Execution
    const problem = (duel.problem as any); // Assuming problem is populated or we need to fetch it
    // Note: If problem is not populated, we might need: const problem = await this._problems.getById(duel.problem as string);
    // Let's assume it is populated for now as per Mongoose patterns in this codebase, but ideally check.

    // We need the solution code for the judge to compare against, OR the judge handles it.
    // In `judgeService.execute`, it takes (userCode, solutionCode, testCases, problem, language).
    // We need to pass the official solution code if the judge needs it for generating expected outputs (which the current logic does if test cases don't have outputs).
    // Or if test cases are already populated with outputs, solutionCode might be optional depending on judge impl.
    // The current JudgeService logic seems to use Piston and expects test cases with outputs to compare against user output.

    const problemDoc = problem?._id ? problem : await this._problems.getById(problem?.toString() || duel.problem?.toString());
    if (!problemDoc) throw new Error("Problem not found for duel");

    const solutionCode = problemDoc.solution?.code || '';
    const testCases = problemDoc.testCases || [];
    const language = problemDoc.solution?.language || 'javascript'; // Default to problem language

    // Execute!
    const userId = playerId;
    console.log('[DuelService] Executing user code against Piston...', { userId, problemId: problemDoc.id, language });
    let result: any;
    try {
      result = await this._judge.execute(userCode, solutionCode, testCases, problemDoc, language);
      console.log('[DuelService] Execution successful:', result.overallStatus);
    } catch (e: any) {
      console.error('[DuelService] Execution failed:', e);
      throw e;
    }

    const submissions = (duel as any).submissions || []
    const cleanedSubmissions = submissions.filter((submission: any) => (submission.user?._id?.toString?.() || submission.userId) !== userId)
    const pWarnings = ((duel as any).player1?.user?._id?.toString?.() || (duel as any).player1?.user?.id) === userId
      ? ((duel as any).player1?.warnings || 0)
      : ((duel as any).player2?.warnings || 0)

    // Disqualified if warnings exceeded -- though this should be handled before execution ideally, but okay.
    console.log('[DuelService] Saving submission. Warnings:', pWarnings);
    const finalStatus = pWarnings >= 3 ? SubmissionStatus.Disqualified : result.overallStatus

    const codeHash = createHash('sha256').update(userCode || '').digest('hex')

    // Save submission
    cleanedSubmissions.push({
      userId: userId,
      user: (userId as any),
      status: finalStatus,
      userCode,
      executionTime: result.executionTime,
      memoryUsage: result.memoryUsage || 0,
      attempts: (result as any).attempts || 1, // Judge helper doesn't track previous attempts count effectively here without db, just default 1 or increment
      codeHash,
      submittedAt: Date.now()
    })

    // Save submission
    await this._duels.update(id, { submissions: cleanedSubmissions })

    // Win Condition: First to solve wins immediately
    if (finalStatus === SubmissionStatus.Accepted) {
      console.log(`[DuelService] User ${userId} solved the problem! Finishing duel.`);
      return this.finish(id, userId, finalStatus, userCode);
    }

    return this._duels.getById(id)
  }
  async cancel(id: string, playerId: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)

    // Auth check: Is user creator?
    const player1Id = (duel.player1.user as any)._id?.toString() || (duel.player1.user as any).id || duel.player1.user;
    const requestUserId = playerId;

    console.log('[DuelService.cancel] Debug:', {
      duelId: id,
      playerId,
      requestUserId: requestUserId?.toString(),
      player1Id: player1Id?.toString(),
      match: player1Id?.toString() === requestUserId?.toString(),
      duelStatus: duel.status
    });

    if (player1Id.toString() !== requestUserId.toString()) {
      throw new Error(ResponseMessages.ONLY_CREATOR_CAN_CANCEL);
    }

    if (duel.status !== DuelStatus.Waiting) {
      throw new Error(ResponseMessages.CANNOT_CANCEL_NOT_WAITING);
    }

    // Refund wager
    if (duel.wager && duel.wager > 0) {
      await this._wallets.add(requestUserId, duel.wager, 'Duel Refund');
    }

    try {
      await this._duels.update(id, { status: DuelStatus.Cancelled, winner: null });
    } catch (error) {
      console.error('[DuelService.cancel] Update Failed:', error);
      throw error;
    }

    return this._duels.getById(id);
  }
}
