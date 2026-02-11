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
    const problem = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : allProblems[Math.floor(Math.random() * allProblems.length)];

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

    const active = all.filter(duel => {
      const player1 = (duel.player1?.user as any);
      const player2 = (duel.player2?.user as any);

      const p1Id = player1?._id?.toString() || player1?.id || (typeof player1 === 'string' ? player1 : null);
      const p2Id = player2?._id?.toString() || player2?.id || (typeof player2 === 'string' ? player2 : null);

      const isParticipant = p1Id === resolvedId || p2Id === resolvedId;
      return duel.status === DuelStatus.InProgress && isParticipant;
    });

    console.log(`[DuelService.listActive] Found ${active.length} active duels for user ${resolvedId}`);
    return active;
  }
  async createOpen(difficulty: Difficulty, wager: number, playerId: string) {
    const allProblems = await this._problems.all()
    const candidates = allProblems.filter(problem => problem.difficulty === difficulty)
    const problem = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : allProblems[Math.floor(Math.random() * allProblems.length)]

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
    // Atomic join
    const updatedDuel = await this._duels.attemptJoin(id, {
      user: (player2User as any)._id || player2User.id,
      warnings: 0
    });

    if (!updatedDuel) {
      // Join failed (likely race condition where status changed to InProgress/Finished/Cancelled)
      if (wager > 0) {
        // Refund the wager we just deducted
        await this._wallets.add(player2UserId, wager, 'Duel Join Failed Refund');
      }
      // Determine why
      const currentDuel = await this._duels.getById(id);
      if (!currentDuel) throw new Error(ResponseMessages.DUEL_NOT_FOUND);
      throw new Error(ResponseMessages.ALREADY_STARTED);
    }

    // Log the join
    console.log(`[DuelService.join] Player ${player2UserId} joined duel ${id}. Status: InProgress`);
    console.log(`[DuelService.join] Player 1: ${(updatedDuel as any).player1?.user?._id || (updatedDuel as any).player1?.user}`);

    return updatedDuel
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

  /**
   * Finish the duel as a draw (no winner). Refunds both players' wagers.
   */
  async finishDraw(id: string) {
    const duel = await this._duels.getById(id);
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND);

    // Guard: only finish if still in progress
    if (duel.status === DuelStatus.Finished) {
      console.log(`[DuelService.finishDraw] Duel ${id} already finished, returning as-is.`);
      return duel;
    }
    if (duel.status !== DuelStatus.InProgress) {
      throw new Error(ResponseMessages.DUEL_NOT_IN_PROGRESS);
    }

    // Mark as finished with no winner
    await this._duels.update(id, { status: DuelStatus.Finished, winner: null });

    // Refund both players' wagers (no one wins, no commission)
    const wager = duel.wager || 0;
    if (wager > 0) {
      const p1Id = (duel.player1?.user as any)?._id?.toString?.() || (duel.player1?.user as any)?.id;
      const p2Id = (duel.player2?.user as any)?._id?.toString?.() || (duel.player2?.user as any)?.id;
      if (p1Id) await this._wallets.add(p1Id, wager, 'Duel draw refund');
      if (p2Id) await this._wallets.add(p2Id, wager, 'Duel draw refund');
    }

    console.log(`[DuelService.finishDraw] Duel ${id} ended as a draw. Wagers refunded.`);
    return this._duels.getById(id);
  }

  // Helper to extract player IDs from a duel
  private _getPlayerIds(duel: any): { p1Id: string | null, p2Id: string | null } {
    const p1 = duel.player1?.user;
    const p2 = duel.player2?.user;
    const p1Id = p1?._id?.toString?.() || p1?.id || (typeof p1 === 'string' ? p1 : null);
    const p2Id = p2?._id?.toString?.() || p2?.id || (typeof p2 === 'string' ? p2 : null);
    return { p1Id, p2Id };
  }

  async submitSolution(id: string, playerId: string, userCode: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)

    // --- GUARD: Duel must be in progress ---
    if (duel.status === DuelStatus.Finished) {
      console.log(`[DuelService.submitSolution] Duel ${id} already finished. Returning as-is.`);
      return duel; // Idempotent: return the finished duel
    }
    if (duel.status !== DuelStatus.InProgress) {
      throw new Error(ResponseMessages.DUEL_NOT_IN_PROGRESS);
    }

    // --- GUARD: Player must be a participant ---
    const { p1Id, p2Id } = this._getPlayerIds(duel);
    const userId = playerId;
    if (userId !== p1Id && userId !== p2Id) {
      throw new Error(ResponseMessages.NOT_A_PARTICIPANT);
    }

    // Server-side Execution
    const problem = (duel.problem as any);
    const problemDoc = problem?._id ? problem : await this._problems.getById(problem?.toString() || duel.problem?.toString());
    if (!problemDoc) throw new Error("Problem not found for duel");

    const solutionCode = problemDoc.solution?.code || '';
    const testCases = problemDoc.testCases || [];
    const language = problemDoc.solution?.language || 'javascript';

    // Execute!
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
    const pWarnings = p1Id === userId
      ? ((duel as any).player1?.warnings || 0)
      : ((duel as any).player2?.warnings || 0)

    // Disqualified if warnings exceeded
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
      attempts: (result as any).attempts || 1,
      codeHash,
      submittedAt: Date.now()
    })

    // Save submission
    await this._duels.update(id, { submissions: cleanedSubmissions })

    // Win Condition: First to solve wins immediately
    if (finalStatus === SubmissionStatus.Accepted) {
      // --- RACE CONDITION FIX: Re-fetch duel to check if it was already finished ---
      const freshDuel = await this._duels.getById(id);
      if (freshDuel && freshDuel.status === DuelStatus.Finished) {
        console.log(`[DuelService] Duel ${id} was already finished by opponent. Skipping finish.`);
        return freshDuel;
      }

      console.log(`[DuelService] User ${userId} solved the problem! Finishing duel.`);
      return this.finish(id, userId, finalStatus, userCode);
    }

    // Wrong answer / runtime error / TLE — do NOT finish. Return duel with submission result embedded.
    console.log(`[DuelService] User ${userId} submitted with status: ${finalStatus}. Duel continues.`);
    const updatedDuel = await this._duels.getById(id);
    // Attach the submission result to the response so frontend knows what happened
    if (updatedDuel) {
      (updatedDuel as any).lastSubmissionResult = {
        overallStatus: finalStatus,
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage || 0,
        results: result.results || []
      };
    }
    return updatedDuel;
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
