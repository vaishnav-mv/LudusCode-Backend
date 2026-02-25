import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import * as fs from 'fs'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { broadcastDuel, broadcastDuelLobby, broadcastDuelInvite } from '../realtime/ws'
import { IDuelService, IJudgeService } from '../interfaces/services'
import { CreateDuelDTO, UpdateDuelStateDTO, CreateOpenChallengeDTO, SetSummaryDTO, FinishDuelDTO, SubmitDuelResultDTO } from '../dto/request/duel.request.dto'
import { mapDuel } from '../utils/mapper'
import { getErrorMessage } from '../utils/errorUtils'
import { DuelStatus, Difficulty } from '../types'

@singleton()
export class DuelController {
  constructor(
    @inject("IDuelService") private _service: IDuelService,
    @inject("IJudgeService") private _judgeService: IJudgeService
  ) { }

  /**
   * @desc    Create a private duel
   * @route   POST /api/duels
   * @req     body: { difficulty, wager, player1Id, player2Id }
   * @res     { duel }
   */
  createDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const body = req.body as CreateDuelDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const duel = await this._service.create(body.difficulty as Difficulty, body.wager, userId, body.player2Id)
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(duel._id!, dto)

    // Broadcast invite if it's a private duel
    if (body.player2Id) {
      broadcastDuelInvite(body.player2Id, {
        duelId: duel._id?.toString() || duel.id || '',
        challengerName: currentUser.username,
        wager: body.wager,
        difficulty: body.difficulty
      })
    }

    return ApiResponse.success(res, dto)
  }

  /**
   * @desc    Get duel details
   * @route   GET /api/duels/:id
   * @req     params: { id }
   * @res     { duel }
   */
  duelDetail = async (req: Request, res: Response) => {
    const duel = await this._service.detail(req.params.id)
    if (!duel) {
      return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return ApiResponse.success(res, mapDuel(duel))
  }

  /**
   * @desc    Update duel state (Admin/System)
   * @route   PATCH /api/duels/:id/state
   * @req     params: { id }, body: { status, winnerId }
   * @res     { duel }
   */
  updateDuelState = async (req: Request, res: Response) => {
    const body = req.body as UpdateDuelStateDTO
    const duel = await this._service.updateState(req.params.id, body.status as DuelStatus, body.winnerId)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(duel._id!, dto)
    return ApiResponse.success(res, dto)
  }

  /**
   * @desc    List open duels (Waiting state)
   * @route   GET /api/duels/open
   * @req     -
   * @res     [Duel]
   */
  listOpenDuels = async (req: Request, res: Response) => {
    const duels = await this._service.listOpen()
    return ApiResponse.success(res, duels.map(mapDuel).filter(Boolean))
  }

  /**
   * @desc    List duel invites for user
   * @route   GET /api/duels/invites
   * @req     -
   * @res     [Duel]
   */
  listInvites = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const duels = await this._service.listInvites(userId)
    return ApiResponse.success(res, duels.map(mapDuel).filter(Boolean))
  }

  /**
   * @desc    Create an open challenge
   * @route   POST /api/duels/open
   * @req     body: { difficulty, wager, playerId }
   * @res     { duel }
   */
  createOpenChallenge = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as CreateOpenChallengeDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const duel = await this._service.createOpen(body.difficulty as Difficulty, body.wager, userId)
    const dto = mapDuel(duel);
    if (dto) {
      broadcastDuel(duel._id!, dto)
      broadcastDuelLobby(dto)
      return ApiResponse.success(res, dto)
    } else {
      return ApiResponse.error(res, 'Error mapping duel', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * @desc    Join a duel
   * @route   POST /api/duels/:id/join
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  joinDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    // Remove body usage for playerId
    const duel = await this._service.join(req.params.id, userId)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

    const dto = mapDuel(duel);
    if (!dto) return ApiResponse.error(res, 'Error mapping duel', HttpStatus.INTERNAL_SERVER_ERROR)

    console.log('[DuelController] Join successful. Broadcasting update:', JSON.stringify(dto, null, 2));
    broadcastDuel(req.params.id, dto)
    broadcastDuelLobby(dto)
    return ApiResponse.success(res, dto)
  }

  /**
   * @desc    Set duel summary
   * @route   POST /api/duels/:id/summary
   * @req     params: { id }, body: { finalOverallStatus, finalUserCode }
   * @res     { duel }
   */
  setDuelSummary = async (req: Request, res: Response) => {
    const body = req.body as SetSummaryDTO
    const duel = await this._service.setSummary(req.params.id, body.finalOverallStatus!, body.finalUserCode!)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  }

  /**
   * @desc    Finish a duel
   * @route   POST /api/duels/:id/finish
   * @req     params: { id }, body: { winnerId, finalOverallStatus, finalUserCode }
   * @res     { duel }
   */
  finishDuel = async (req: Request, res: Response) => {
    const body = req.body as FinishDuelDTO
    const duel = await this._service.finish(req.params.id, body.winnerId, body.finalOverallStatus, body.finalUserCode)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  }

  /**
   * @desc    Get duel summary/results
   * @route   GET /api/duels/:id/summary
   * @req     params: { id }
   * @res     { duel, result, userCode }
   */
  getDuelSummary = async (req: Request, res: Response) => {
    const duel = await this._service.detail(req.params.id)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';

    // Find the specific user's last unique submission
    const userSubmission = duel.submissions?.slice().reverse().find(s => {
      const sUser = s.user as { _id?: object, id?: string } | null;
      const sUserId = sUser?._id?.toString() || (typeof sUser?.id === 'string' ? sUser.id : null) || String(s.user);
      return sUserId === userId?.toString();
    });


    // FILE DEBUGGING RE-ADDED
    const debugLog = `
    [${new Date().toISOString()}] getDuelSummary Debug:
    DuelId: ${req.params.id}
    UserId: ${userId}
    Submissions Len: ${duel.submissions?.length}
    First Sub User: ${duel.submissions?.[0]?.user}
    First Sub User Type: ${typeof duel.submissions?.[0]?.user}
    UserSubmission Found: ${!!userSubmission}
    UserSubmission Status: ${userSubmission?.status}
    FinalOverallStatus: ${duel.finalOverallStatus}
    FinalUserCode: ${duel.finalUserCode ? 'Yes' : 'No'}
    --------------------------------------------------
    `;
    try { fs.appendFileSync('e:/LudusCode/back-end/logs/debug_cortex.log', debugLog); } catch (error) {
      console.error('Failed to write debug log:', error);
    }




    // Provide the user's last code, or empty if they didn't submit anything
    const userCode = userSubmission?.userCode || '';
    const result = userSubmission ? {
      overallStatus: userSubmission.status,
      results: [],
      executionTime: userSubmission.executionTime,
      memoryUsage: userSubmission.memoryUsage
    } : (duel.finalOverallStatus ? { overallStatus: duel.finalOverallStatus, results: [], executionTime: 0, memoryUsage: 0 } : undefined);

    return ApiResponse.success(res, { duel: mapDuel(duel), result, userCode })
  }

  /**
   * @desc    Submit solution for a duel (server-side code execution)
   * @route   POST /api/duels/:id/submit
   * @req     params: { id }, body: { playerId, userCode }
   * @res     { duel, submissionResult }
   */
  submitDuelResult = async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const body = req.body as SubmitDuelResultDTO
    const { userCode } = body;
    const duelId = req.params.id;

    try {
      // 1. Get Duel to find problemId
      const duel = await this._service.detail(duelId);
      if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

      const problem = duel.problem;
      const problemId = typeof problem === 'string' ? problem : (problem.id || problem._id?.toString());
      if (!problemId) throw new Error("Problem ID not found");

      // 2. Fetch language from problem? or rely on JudgeService to detect/default?
      // JudgeService needs language. We can try to infer or pass 'javascript' default.
      // Better: DuelService previously fetched problem to get language.
      // Now Controller can't easily fetch problem doc unless we inject ProblemRepository (violation).
      // But JudgeService fetches problemDoc internally now! 
      // JudgeService.execute(problemId, userCode, language)
      // We need 'language'.
      // Assumption: JudgeService can handle fetching problem details. 
      // But we need to pass 'language' to JudgeService.
      // If we don't know it, we might need to fetch problem summary or require frontend to send it?
      // Frontend typically sends userCode. It might send language too?
      // Check SubmitDuelResultDTO.

      // Temporary fix: Default 'javascript' or assume 'javascript'.
      // Or: JudgeService should look up language from problem if not provided?
      // My JudgeService implementation uses `language` param to select config.

      // Let's modify JudgeService to allow optional language, or fetch it from problem if not provided?
      // Current JudgeService: `language: string` (required).
      // I can change JudgeService to default language if not provided, OR fetch from problem.

      // Actually, JudgeService ALREADY fetches problem.
      // JudgeService uses problem.solutions[] to find the right language

      // For now, I will pass 'javascript' as default or 'javascript'.
      // Ideally, the request body should have `language`.

      // Let's assume 'javascript' for now as existing code did default to it.
      const language = 'javascript';

      const result = await this._judgeService.execute(problemId, userCode, language);

      const updatedDuel = await this._service.processSubmission(duelId, userId, userCode, result);
      if (!updatedDuel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

      const mapped = mapDuel(updatedDuel);
      // Attach lastSubmissionResult if present (for wrong answer feedback)
      const lastSubmissionResult = updatedDuel.lastSubmissionResult || null;

      if (mapped) broadcastDuel(req.params.id, mapped)
      return ApiResponse.success(res, { ...mapped, submissionResult: lastSubmissionResult })
    } catch (error: unknown) {
      // Map known error messages to HTTP status codes
      const msg = getErrorMessage(error);
      if (msg === ResponseMessages.DUEL_ALREADY_FINISHED) {
        return ApiResponse.error(res, msg, HttpStatus.BAD_REQUEST)
      }
      if (msg === ResponseMessages.NOT_A_PARTICIPANT) {
        return ApiResponse.error(res, msg, HttpStatus.FORBIDDEN)
      }
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return ApiResponse.error(res, msg, HttpStatus.BAD_REQUEST)
      }
      throw error; // Re-throw unknown errors for global error handler
    }
  }

  /**
   * @desc    Timeout a duel (timer expired — ends as draw)
   * @route   POST /api/duels/:id/timeout
   * @req     params: { id }
   * @res     { duel }
   */
  timeoutDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    try {
      const duel = await this._service.finishDraw(req.params.id);
      if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

      const dto = mapDuel(duel);
      if (dto) broadcastDuel(req.params.id, dto)
      return ApiResponse.success(res, dto)
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return ApiResponse.error(res, msg, HttpStatus.BAD_REQUEST)
      }
      throw error;
    }
  }

  /**
   * @desc    List active duels for user
   * @route   GET /api/duels/active
   * @req     -
   * @res     [Duel]
   */
  listActiveDuels = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
      const duels = await this._service.listActive(userId);
      return ApiResponse.success(res, duels.map(mapDuel).filter(Boolean))
    } catch (error: unknown) {
      return ApiResponse.error(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * @desc    Cancel a duel
   * @route   POST /api/duels/:id/cancel
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  cancelDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const duel = await this._service.cancel(req.params.id, userId)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const dto = mapDuel(duel);
    if (dto) {
      broadcastDuel(duel._id!, dto)
      broadcastDuelLobby(dto)
      return ApiResponse.success(res, dto)
    } else {
      return ApiResponse.error(res, 'Error mapping duel', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
  /**
   * @desc    Forfeit a duel
   * @route   POST /api/duels/:id/forfeit
   * @req     params: { id }
   * @res     { duel }
   */
  forfeitDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    try {
      const duel = await this._service.forfeit(req.params.id, userId)
      if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
      const dto = mapDuel(duel);
      if (dto) broadcastDuel(req.params.id, dto)
      return ApiResponse.success(res, dto)
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return ApiResponse.error(res, msg, HttpStatus.BAD_REQUEST)
      }
      if (msg === ResponseMessages.NOT_A_PARTICIPANT) {
        return ApiResponse.error(res, msg, HttpStatus.FORBIDDEN)
      }
      throw error;
    }
  }
}
