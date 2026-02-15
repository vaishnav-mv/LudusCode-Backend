import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { broadcastDuel, broadcastDuelLobby, broadcastDuelInvite } from '../realtime/ws'
import { IDuelService } from '../interfaces/services'
import { CreateDuelDTO, UpdateDuelStateDTO, CreateOpenChallengeDTO, SetSummaryDTO, FinishDuelDTO, SubmitDuelResultDTO } from '../dto/request/duel.request.dto'
import { mapDuel } from '../utils/mapper'
import { getErrorMessage } from '../utils/errorUtils'
import { DuelStatus, Difficulty } from '../types'

@singleton()
export class DuelController {
  constructor(@inject("IDuelService") private _service: IDuelService) { }

  /**
   * @desc    Create a private duel
   * @route   POST /api/duels
   * @req     body: { difficulty, wager, player1Id, player2Id }
   * @res     { duel }
   */
  createDuel = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as CreateDuelDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
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

    res.json(dto)
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
      return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    }
    res.json(mapDuel(duel))
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
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(duel._id!, dto)
    res.json(dto)
  }

  /**
   * @desc    List open duels (Waiting state)
   * @route   GET /api/duels/open
   * @req     -
   * @res     [Duel]
   */
  listOpenDuels = async (req: Request, res: Response) => {
    const duels = await this._service.listOpen()
    res.json(duels.map(mapDuel).filter(Boolean))
  }

  /**
   * @desc    List duel invites for user
   * @route   GET /api/duels/invites
   * @req     -
   * @res     [Duel]
   */
  listInvites = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const duels = await this._service.listInvites(userId)
    res.json(duels.map(mapDuel).filter(Boolean))
  }

  /**
   * @desc    Create an open challenge
   * @route   POST /api/duels/open
   * @req     body: { difficulty, wager, playerId }
   * @res     { duel }
   */
  createOpenChallenge = async (req: Request, res: Response) => {
    const currentUser = req.user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as CreateOpenChallengeDTO
    const userId = currentUser.sub || currentUser.id || currentUser._id?.toString() || '';
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const duel = await this._service.createOpen(body.difficulty as Difficulty, body.wager, userId)
    const dto = mapDuel(duel);
    if (dto) {
      broadcastDuel(duel._id!, dto)
      broadcastDuelLobby(dto)
      res.json(dto)
    } else {
      res.status(500).json({ message: 'Error mapping duel' })
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
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    // Remove body usage for playerId
    const duel = await this._service.join(req.params.id, userId)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })

    const dto = mapDuel(duel);
    if (!dto) return res.status(500).json({ message: 'Error mapping duel' });

    console.log('[DuelController] Join successful. Broadcasting update:', JSON.stringify(dto, null, 2));
    broadcastDuel(req.params.id, dto)
    broadcastDuelLobby(dto)
    res.json(dto)
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
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(req.params.id, dto)
    res.json(dto)
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
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    const dto = mapDuel(duel);
    if (dto) broadcastDuel(req.params.id, dto)
    res.json(dto)
  }

  /**
   * @desc    Get duel summary/results
   * @route   GET /api/duels/:id/summary
   * @req     params: { id }
   * @res     { duel, result, userCode }
   */
  getDuelSummary = async (req: Request, res: Response) => {
    const duel = await this._service.detail(req.params.id)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    const result = duel.finalOverallStatus ? { overallStatus: duel.finalOverallStatus, results: [], executionTime: 0, memoryUsage: 0 } : undefined
    res.json({ duel: mapDuel(duel), result, userCode: duel.finalUserCode })
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
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })

    const body = req.body as SubmitDuelResultDTO
    const { userCode } = body;
    const duelId = req.params.id;

    try {
      const updatedDuel = await this._service.submitSolution(duelId, userId, userCode);
      if (!updatedDuel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })

      const mapped = mapDuel(updatedDuel);
      // Attach lastSubmissionResult if present (for wrong answer feedback)
      const lastSubmissionResult = updatedDuel.lastSubmissionResult || null;

      if (mapped) broadcastDuel(req.params.id, mapped)
      res.json({ ...mapped, submissionResult: lastSubmissionResult })
    } catch (e: unknown) {
      // Map known error messages to HTTP status codes
      const msg = getErrorMessage(e);
      if (msg === ResponseMessages.DUEL_ALREADY_FINISHED) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: msg });
      }
      if (msg === ResponseMessages.NOT_A_PARTICIPANT) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: msg });
      }
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: msg });
      }
      throw e; // Re-throw unknown errors for global error handler
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
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })

    try {
      const duel = await this._service.finishDraw(req.params.id);
      if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })

      const dto = mapDuel(duel);
      if (dto) broadcastDuel(req.params.id, dto)
      res.json(dto)
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: msg });
      }
      throw e;
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
      if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED });
      const duels = await this._service.listActive(userId);
      res.json(duels.map(mapDuel).filter(Boolean));
    } catch (error: unknown) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: getErrorMessage(error) });
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
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const duel = await this._service.cancel(req.params.id, userId)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    const dto = mapDuel(duel);
    if (dto) {
      broadcastDuel(duel._id!, dto)
      broadcastDuelLobby(dto)
      res.json(dto)
    } else {
      res.status(500).json({ message: 'Error mapping duel' })
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
    if (!userId) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })

    try {
      const duel = await this._service.forfeit(req.params.id, userId)
      if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
      const dto = mapDuel(duel);
      if (dto) broadcastDuel(req.params.id, dto)
      res.json(dto)
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      if (msg === ResponseMessages.DUEL_NOT_IN_PROGRESS) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: msg });
      }
      if (msg === ResponseMessages.NOT_A_PARTICIPANT) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: msg });
      }
      throw e;
    }
  }
}
