import { singleton, inject } from 'tsyringe'
import { IDuelRepository, IProblemRepository, IUserRepository, IWalletRepository } from '../interfaces/repositories'
import { IDuelService } from '../interfaces/services'
import { Duel, DuelStatus, Difficulty, SubmissionStatus, User, SubmissionResult } from '../types'
import { createHash } from 'crypto'

import { ResponseMessages } from '../constants'

@singleton()
export class DuelService implements IDuelService {
  constructor(
    @inject("IDuelRepository") private _duels: IDuelRepository,
    @inject("IProblemRepository") private _problems: IProblemRepository,
    @inject("IUserRepository") private _users: IUserRepository,
    @inject("IWalletRepository") private _wallets: IWalletRepository,
  ) { }

  async create(difficulty: Difficulty, wager: number, player1Id: string, player2Id: string) {
    const allProblems = await this._problems.all();
    // Filter out Custom problems (only allow Approved)
    const approvedProblems = allProblems.filter(problem => problem.status === 'Approved');
    const candidates = approvedProblems.filter(problem => problem.difficulty === difficulty);
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
        const winnerId = winner.id || winner._id?.toString()
        if (winnerId) await this._wallets.add(winnerId, duel.wager * 2, 'Duel winnings');
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
      const { p1Id, p2Id } = this._getPlayerIds(duel);
      const isParticipant = p1Id === resolvedId || p2Id === resolvedId;
      return duel.status === DuelStatus.InProgress && isParticipant;
    });


    return active;
  }
  async listInvites(userId: string) {
    const all = await this._duels.all();
    // Filter for duels where I am player2 AND status is Waiting
    const invites = all.filter(duel => {
      const { p2Id } = this._getPlayerIds(duel);
      return p2Id === userId && duel.status === DuelStatus.Waiting;
    });
    return invites;
  }
  async createOpen(difficulty: Difficulty, wager: number, playerId: string) {
    const allProblems = await this._problems.all()
    // Filter out Custom problems
    const approvedProblems = allProblems.filter(problem => problem.status === 'Approved');
    const candidates = approvedProblems.filter(problem => problem.difficulty === difficulty)
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
      problem: typeof problem === 'string' ? problem : (problem.id || problem._id!.toString()),
      player1: { user: typeof player1User === 'string' ? player1User : (player1User.id || player1User._id!.toString()), warnings: 0 },
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
    const player1Obj = duel.player1.user;
    if (!player1Obj) throw new Error(ResponseMessages.DUEL_NOT_FOUND); // Should imply invalid duel state
    const player1Id = typeof player1Obj === 'string' ? player1Obj : (player1Obj.id || player1Obj._id?.toString());
    if (!player1Id) throw new Error(ResponseMessages.DUEL_NOT_FOUND);
    if (player1Id.toString() === player2UserId.toString()) {
      throw new Error(ResponseMessages.CANNOT_JOIN_OWN_DUEL);
    }

    const player2User = await this._users.getById(player2UserId)
    if (!player2User) throw new Error(ResponseMessages.USER_NOT_FOUND)
    const wager = duel.wager || 0
    if (wager > 0) await this._wallets.add(player2UserId, -wager, 'Duel wager')
    // Atomic join
    const updatedDuel = await this._duels.attemptJoin(id, {
      user: player2User.id || player2User._id?.toString() || '',
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


    return updatedDuel
  }
  async setSummary(id: string, finalOverallStatus: string, finalUserCode: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)
    await this._duels.update(id, { finalOverallStatus: finalOverallStatus as SubmissionStatus, finalUserCode })
    return this._duels.getById(id)
  }
  async finish(id: string, winnerId?: string, finalOverallStatus?: string, finalUserCode?: string) {
    // 1. Determine the winner object
    let winner: User | null = null;
    if (winnerId) {
      const resolvedWinnerId = winnerId;
      const user = await this._users.getById(resolvedWinnerId);
      winner = user || null;
    }

    // 2. Atomic Update: Try to set status to Finished
    // This returns the updated doc ONLY if it was previously InProgress
    const finishedDuel = await this._duels.attemptFinish(id, winner, DuelStatus.Finished);

    if (!finishedDuel) {

      // If it failed, we can still perform the "side effect" of updating the submission details 
      // if we want, but we should NOT process money or ELO.
      if (finalOverallStatus || finalUserCode) {
        await this._duels.update(id, { finalOverallStatus: finalOverallStatus as SubmissionStatus, finalUserCode });
      }
      return this._duels.getById(id);
    }

    // 3. Post-Finish Logic (Run only once because attemptFinish is atomic)

    // A. Update submission details
    if (finalOverallStatus || finalUserCode) {
      await this._duels.update(id, { finalOverallStatus: finalOverallStatus as SubmissionStatus, finalUserCode });
    }

    // B. Transfer Winnings
    if (winner && finishedDuel.wager && finishedDuel.wager > 0) {
      const winnerId = winner.id || winner._id?.toString();
      if (winnerId) await this._wallets.add(winnerId, finishedDuel.wager * 2, 'Duel winnings');
    }

    // C. ELO Calculation
    try {
      const duelForElo = finishedDuel; // We already have the updated duel
      if (duelForElo && duelForElo.winner) {
        const { p1Id, p2Id } = this._getPlayerIds(duelForElo);
        // Helper to get ID from User | string
        const getWinnerId = (u: User | string | undefined | null) => {
          if (!u) return null;
          return typeof u === 'string' ? u : (u.id || u._id?.toString() || null);
        };
        const absoluteWinnerId = getWinnerId(duelForElo.winner);

        if (p1Id && p2Id && absoluteWinnerId) {
          const absoluteLoserId = absoluteWinnerId === p1Id ? p2Id : p1Id
          const winner = await this._users.getById(absoluteWinnerId)
          const loser = await this._users.getById(absoluteLoserId)

          if (winner && loser) {
            const kFactor = 32
            const expectedWinner = 1 / (1 + Math.pow(10, ((loser.elo || 1200) - (winner.elo || 1200)) / 400))
            const expectedLoser = 1 / (1 + Math.pow(10, ((winner.elo || 1200) - (loser.elo || 1200)) / 400))
            const newWinnerElo = Math.round((winner.elo || 1200) + kFactor * (1 - expectedWinner))
            const newLoserElo = Math.round((loser.elo || 1200) + kFactor * (0 - expectedLoser))

            await this._users.update(absoluteWinnerId, { elo: newWinnerElo, duelsWon: (winner.duelsWon || 0) + 1 })
            await this._users.update(absoluteLoserId, { elo: newLoserElo, duelsLost: (loser.duelsLost || 0) + 1 })
          }
        }
      }
    } catch { /* empty */ }

    return this._duels.getById(id); // Return fresh copy
  }

  /**
   * Finish the duel as a draw (no winner). Refunds both players' wagers.
   */
  /**
   * Finish the duel as a draw (no winner). Refunds both players' wagers.
   */
  async finishDraw(id: string) {
    const duel = await this._duels.getById(id);
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND);

    // Atomic update: only succeeds if status is still InProgress
    const finishedDuel = await this._duels.attemptFinish(id, null, DuelStatus.Finished);

    if (!finishedDuel) {

      return this._duels.getById(id);
    }

    // Refund both players' wagers (no one wins, no commission)
    const wager = duel.wager || 0;
    if (wager > 0) {
      const { p1Id, p2Id } = this._getPlayerIds(duel);
      if (p1Id) await this._wallets.add(p1Id, wager, 'Duel draw refund');
      if (p2Id) await this._wallets.add(p2Id, wager, 'Duel draw refund');
    }


    return finishedDuel;
  }

  // Helper to extract player IDs from a duel
  private _getPlayerIds(duel: Duel): { p1Id: string | null, p2Id: string | null } {
    const getUserId = (user: User | string | undefined | null) => {
      if (!user) return null;
      if (typeof user === 'string') return user;
      return user.id || user._id?.toString() || null;
    }
    return {
      p1Id: getUserId(duel.player1?.user),
      p2Id: getUserId(duel.player2?.user)
    };
  }

  async processSubmission(id: string, userId: string, userCode: string, result: SubmissionResult) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)

    // --- GUARD: Duel must be in progress ---
    if (duel.status === DuelStatus.Finished) {

      return duel; // Idempotent
    }
    if (duel.status !== DuelStatus.InProgress) {
      throw new Error(ResponseMessages.DUEL_NOT_IN_PROGRESS);
    }

    // --- GUARD: Player must be a participant ---
    const { p1Id, p2Id } = this._getPlayerIds(duel);
    if (userId !== p1Id && userId !== p2Id) {
      throw new Error(ResponseMessages.NOT_A_PARTICIPANT);
    }

    const submissions = duel.submissions || []
    const cleanedSubmissions = submissions.filter((submission) => {
      const sUserId = typeof submission.user === 'string' ? submission.user : (submission.user.id || submission.user._id?.toString());
      return sUserId !== userId
    })

    const pWarnings = p1Id === userId
      ? (duel.player1?.warnings || 0)
      : (duel.player2?.warnings || 0)

    // Disqualified if warnings exceeded

    const finalStatus = pWarnings >= 3 ? SubmissionStatus.Disqualified : result.overallStatus

    const codeHash = createHash('sha256').update(userCode || '').digest('hex')

    // Save submission
    cleanedSubmissions.push({
      userId: userId, // Legacy ?
      user: userId,
      status: finalStatus,
      userCode,
      executionTime: result.executionTime,
      memoryUsage: result.memoryUsage || 0,
      attempts: result.attempts || 1,
      codeHash,
      submittedAt: Date.now()
    } as unknown as import('../types').Submission)

    // Save submission
    await this._duels.update(id, { submissions: cleanedSubmissions })

    // Win Condition: First to solve wins immediately
    if (finalStatus === SubmissionStatus.Accepted) {
      // --- RACE CONDITION FIX: Re-fetch duel to check if it was already finished ---
      const freshDuel = await this._duels.getById(id);
      if (freshDuel && freshDuel.status === DuelStatus.Finished) {

        return freshDuel;
      }


      return this.finish(id, userId, finalStatus, userCode);
    }

    // Wrong answer / runtime error / TLE — do NOT finish. Return duel with submission result embedded.

    const updatedDuel = await this._duels.getById(id);
    // Attach the submission result to the response so frontend knows what happened
    if (updatedDuel) {
      updatedDuel.lastSubmissionResult = {
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
    const { p1Id, p2Id } = this._getPlayerIds(duel);
    const requestUserId = playerId;



    if (p1Id?.toString() !== requestUserId.toString() && p2Id?.toString() !== requestUserId.toString()) {
      throw new Error(ResponseMessages.ONLY_CREATOR_CAN_CANCEL); // or "Only participants can cancel"
    }

    if (duel.status !== DuelStatus.Waiting) {
      throw new Error(ResponseMessages.CANNOT_CANCEL_NOT_WAITING);
    }

    // Refund wager
    // Guarded by attemptCancel below

    try {
      // Atomic Update: Only cancel if Waiting
      const cancelledDuel = await this._duels.attemptCancel(id);

      if (!cancelledDuel) {
        // Race condition: Someone presumably joined or it was cancelled already
        throw new Error(ResponseMessages.CANNOT_CANCEL_NOT_WAITING);
      }

      // If atomic update succeeded, Refund
      if (duel.wager && duel.wager > 0) {
        await this._wallets.add(requestUserId, duel.wager, 'Duel Refund');
      }

      return cancelledDuel;
    } catch (error: unknown) {
      console.error('[DuelService.cancel] Update Failed:', error);
      throw error;
    }
  }
  async forfeit(id: string, playerId: string) {
    const duel = await this._duels.getById(id)
    if (!duel) throw new Error(ResponseMessages.DUEL_NOT_FOUND)
    if (duel.status !== DuelStatus.InProgress) throw new Error(ResponseMessages.DUEL_NOT_IN_PROGRESS)

    const { p1Id, p2Id } = this._getPlayerIds(duel)
    if (playerId !== p1Id && playerId !== p2Id) {
      throw new Error(ResponseMessages.NOT_A_PARTICIPANT)
    }

    const winnerId = playerId === p1Id ? p2Id : p1Id
    if (!winnerId) {
      // Should not happen if duel is InProgress and valid
      throw new Error(ResponseMessages.USER_NOT_FOUND)
    }


    return this.finish(id, winnerId, SubmissionStatus.Forfeit)
  }

  async reportWarning(duelId: string, userId: string, reason?: 'visibility' | 'paste'): Promise<{ duel: Duel | null, disqualified: boolean }> {
    const duel = await this._duels.getById(duelId)
    if (!duel) return { duel: null, disqualified: false }
    if (duel.status !== DuelStatus.InProgress) return { duel, disqualified: false }

    const { p1Id, p2Id } = this._getPlayerIds(duel)
    const isPlayer1 = userId === p1Id
    const isPlayer2 = userId === p2Id
    if (!isPlayer1 && !isPlayer2) return { duel, disqualified: false }

    // Increment warnings on the correct player
    const currentWarnings = isPlayer1
      ? (duel.player1?.warnings || 0)
      : (duel.player2?.warnings || 0)
    const newWarnings = currentWarnings + 1



    // Since _duels.update takes Partial<Duel>, and we constructed dot notation keys above which strictly simple Partial<Duel> might not support without casting to any or using a specific update method
    // Let's refactor to use object structure if the repository supports it, OR just accept that we need to cast to any to pass dot notation if simple update doesn't support deep merge automatically.
    // Actually, looking at typical repo implementation: Model.findByIdAndUpdate(id, data). 
    // If data is { "player1.warnings": 1 }, Mongoose handles it.
    // But Partial<Duel> expects { player1: { ... } }.
    // Let's construct the nested object safely.

    const pData = isPlayer1 ? { ...duel.player1 } : { ...duel.player2 }
    pData.warnings = newWarnings
    if (reason) {
      if (!pData.warningsBreakdown) pData.warningsBreakdown = { paste: 0, visibility: 0 }
      if (reason === 'visibility') pData.warningsBreakdown.visibility = (pData.warningsBreakdown.visibility || 0) + 1
      else if (reason === 'paste') pData.warningsBreakdown.paste = (pData.warningsBreakdown.paste || 0) + 1
    }

    const safePayload: Partial<Duel> = {}
    if (isPlayer1) safePayload.player1 = pData
    else safePayload.player2 = pData

    await this._duels.update(duelId, safePayload)



    // Auto-disqualify at MAX_WARNINGS (3)
    if (newWarnings >= 3) {
      const opponentId = isPlayer1 ? p2Id : p1Id
      if (opponentId) {

        const finishedDuel = await this.finish(duelId, opponentId, SubmissionStatus.Disqualified)
        return { duel: finishedDuel || null, disqualified: true }
      }
    }

    const updatedDuel = await this._duels.getById(duelId)
    return { duel: updatedDuel || null, disqualified: false }
  }
}
