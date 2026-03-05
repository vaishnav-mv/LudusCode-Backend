import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import * as fs from 'fs'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { broadcastDuel, broadcastDuelLobby, broadcastDuelInvite } from '../realtime/ws'
import { IDuelService, IJudgeService } from '../interfaces/services'
import { CreateDuelDTO, UpdateDuelStateDTO, CreateOpenChallengeDTO, SetSummaryDTO, FinishDuelDTO, SubmitDuelResultDTO } from '../dto/request/duel.request.dto'
import { DuelStatus, Difficulty } from '../types'
import { asyncHandler } from "../utils/asyncHandler";
import logger from '../utils/logger';

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
  createDuel = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const body = req.body as CreateDuelDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const dto = await this._service.create(body.difficulty as Difficulty, body.wager, userId, body.player2Id)
    if (dto) broadcastDuel(dto.id, dto)

    // Broadcast invite if it's a private duel
    if (body.player2Id) {
      broadcastDuelInvite(body.player2Id, {
        duelId: dto.id,
        challengerName: currentUser.username,
        wager: body.wager,
        difficulty: body.difficulty
      })
    }

    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    Get duel details
   * @route   GET /api/duels/:id
   * @req     params: { id }
   * @res     { duel }
   */
  duelDetail = asyncHandler(async (req: Request, res: Response) => {
    const duel = await this._service.detail(req.params.id)
    if (!duel) {
      return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return ApiResponse.success(res, duel)
  })

  /**
   * @desc    Update duel state (Admin/System)
   * @route   PATCH /api/duels/:id/state
   * @req     params: { id }, body: { status, winnerId }
   * @res     { duel }
   */
  updateDuelState = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdateDuelStateDTO
    const dto = await this._service.updateState(req.params.id, body.status as DuelStatus, body.winnerId)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(dto.id, dto)
    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    List open duels (Waiting state)
   * @route   GET /api/duels/open
   * @req     -
   * @res     [Duel]
   */
  listOpenDuels = asyncHandler(async (req: Request, res: Response) => {
    const duels = await this._service.listOpen()
    return ApiResponse.success(res, duels)
  })

  /**
   * @desc    List duel invites for user
   * @route   GET /api/duels/invites
   * @req     -
   * @res     [Duel]
   */
  listInvites = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const duels = await this._service.listInvites(userId)
    return ApiResponse.success(res, duels)
  })

  /**
   * @desc    Create an open challenge
   * @route   POST /api/duels/open
   * @req     body: { difficulty, wager, playerId }
   * @res     { duel }
   */
  createOpenChallenge = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as CreateOpenChallengeDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const dto = await this._service.createOpen(body.difficulty as Difficulty, body.wager, userId)
    if (dto) {
      broadcastDuel(dto.id, dto)
      broadcastDuelLobby(dto)
      return ApiResponse.success(res, dto)
    } else {
      return ApiResponse.error(res, 'Error creating duel', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  })

  /**
   * @desc    Join a duel
   * @route   POST /api/duels/:id/join
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  joinDuel = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const dto = await this._service.join(req.params.id, userId)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)

    logger.debug('[DuelController] Join successful. Broadcasting update.');
    broadcastDuel(req.params.id, dto)
    broadcastDuelLobby(dto)
    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    Set duel summary
   * @route   POST /api/duels/:id/summary
   * @req     params: { id }, body: { finalOverallStatus, finalUserCode }
   * @res     { duel }
   */
  setDuelSummary = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as SetSummaryDTO
    const dto = await this._service.setSummary(req.params.id, body.finalOverallStatus!, body.finalUserCode!)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    Finish a duel
   * @route   POST /api/duels/:id/finish
   * @req     params: { id }, body: { winnerId, finalOverallStatus, finalUserCode }
   * @res     { duel }
   */
  finishDuel = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as FinishDuelDTO
    const dto = await this._service.finish(req.params.id, body.winnerId, body.finalOverallStatus, body.finalUserCode)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    Get duel summary/results
   * @route   GET /api/duels/:id/summary
   * @req     params: { id }
   * @res     { duel, result, userCode }
   */
  getDuelSummary = asyncHandler(async (req: Request, res: Response) => {
    const duel = await this._service.detail(req.params.id)
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    const userSubmission = duel.submissions?.slice().reverse().find(s => {
      const sUserId = typeof s.user === 'string' ? s.user : (s.user?.id || '');
      return sUserId === userId?.toString();
    });
    const debugLog = `
    [${new Date().toISOString()}] getDuelSummary Debug:
    DuelId: ${req.params.id}
    UserId: ${userId}
    Submissions Len: ${duel.submissions?.length}
    First Sub User: ${duel.submissions?.[0]?.user}
    First Sub User Type: ${typeof duel.submissions?.[0]?.user}
    UserSubmission Found: ${!!userSubmission}
    UserSubmission Status: ${userSubmission?.status}
    --------------------------------------------------
    `;
    fs.appendFileSync('e:/LudusCode/back-end/logs/debug_cortex.log', debugLog);
    const userCode = userSubmission?.userCode || '';
    const result = userSubmission ? {
      overallStatus: userSubmission.status,
      results: [],
      executionTime: userSubmission.executionTime,
      memoryUsage: userSubmission.memoryUsage
    } : undefined;
    return ApiResponse.success(res, { duel, result, userCode })
  })

  /**
   * @desc    Submit solution for a duel (server-side code execution)
   * @route   POST /api/duels/:id/submit
   * @req     params: { id }, body: { playerId, userCode }
   * @res     { duel, submissionResult }
   */
  submitDuelResult = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as SubmitDuelResultDTO
    const { userCode } = body;
    const duelId = req.params.id;
    const duel = await this._service.detail(duelId);
    if (!duel) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    const problem = duel.problem;
    const problemId = typeof problem === 'string' ? problem : problem.id;
    if (!problemId) throw new Error("Problem ID not found");
    const language = 'javascript';
    const result = await this._judgeService.execute(problemId, userCode, language);
    const mapped = await this._service.processSubmission(duelId, userId, userCode, result);
    if (!mapped) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(req.params.id, mapped)
    return ApiResponse.success(res, mapped)
  })

  /**
   * @desc    Timeout a duel (timer expired — ends as draw)
   * @route   POST /api/duels/:id/timeout
   * @req     params: { id }
   * @res     { duel }
   */
  timeoutDuel = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const dto = await this._service.finishDraw(req.params.id);
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  })

  /**
   * @desc    List active duels for user
   * @route   GET /api/duels/active
   * @req     -
   * @res     [Duel]
   */
  listActiveDuels = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const duels = await this._service.listActive(userId);
    return ApiResponse.success(res, duels)
  })

  /**
   * @desc    Cancel a duel
   * @route   POST /api/duels/:id/cancel
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  cancelDuel = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const dto = await this._service.cancel(req.params.id, userId)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(dto.id, dto)
    broadcastDuelLobby(dto)
    return ApiResponse.success(res, dto)
  })
  /**
   * @desc    Forfeit a duel
   * @route   POST /api/duels/:id/forfeit
   * @req     params: { id }
   * @res     { duel }
   */
  forfeitDuel = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const dto = await this._service.forfeit(req.params.id, userId)
    if (!dto) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    broadcastDuel(req.params.id, dto)
    return ApiResponse.success(res, dto)
  })
}
