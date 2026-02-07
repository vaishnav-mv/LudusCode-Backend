import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { broadcastDuel } from '../realtime/ws'
import { IDuelService } from '../interfaces/services'
import { CreateDuelDTO, UpdateDuelStateDTO, CreateOpenChallengeDTO, DuelPlayerActionDTO, SetSummaryDTO, FinishDuelDTO, SubmitDuelResultDTO } from '../dto/request/duel.request.dto'
import { mapDuel } from '../utils/mapper'

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
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as CreateDuelDTO
    const duel = await this._service.create(body.difficulty as any, body.wager, currentUser.sub, body.player2Id)
    broadcastDuel(duel._id!, mapDuel(duel))
    res.json(mapDuel(duel))
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
    const duel = await this._service.updateState(req.params.id, body.status as any, body.winnerId)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    broadcastDuel(duel._id!, mapDuel(duel))
    res.json(mapDuel(duel))
  }

  /**
   * @desc    List open duels (Waiting state)
   * @route   GET /api/duels/open
   * @req     -
   * @res     [Duel]
   */
  listOpenDuels = async (req: Request, res: Response) => {
    const duels = await this._service.listOpen()
    res.json(duels.map(mapDuel))
  }

  /**
   * @desc    Create an open challenge
   * @route   POST /api/duels/open
   * @req     body: { difficulty, wager, playerId }
   * @res     { duel }
   */
  createOpenChallenge = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as CreateOpenChallengeDTO
    const duel = await this._service.createOpen(body.difficulty as any, body.wager, currentUser.sub)
    broadcastDuel(duel._id!, mapDuel(duel))
    res.json(mapDuel(duel))
  }

  /**
   * @desc    Join a duel
   * @route   POST /api/duels/:id/join
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  joinDuel = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    // Remove body usage for playerId
    const duel = await this._service.join(req.params.id, currentUser.sub)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    broadcastDuel(req.params.id, mapDuel(duel))
    res.json(mapDuel(duel))
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
    broadcastDuel(req.params.id, mapDuel(duel))
    res.json(mapDuel(duel))
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
    broadcastDuel(req.params.id, mapDuel(duel))
    res.json(mapDuel(duel))
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
    const result = (duel as any).finalOverallStatus ? { overallStatus: (duel as any).finalOverallStatus, results: [], executionTime: 0, memoryUsage: 0 } : undefined
    res.json({ duel: mapDuel(duel), result, userCode: (duel as any).finalUserCode })
  }

  /**
   * @desc    Submit result for a duel
   * @route   POST /api/duels/:id/submit
   * @req     params: { id }, body: { playerId, result, userCode }
   * @res     { duel }
   */
  async submitDuelResult = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as SubmitDuelResultDTO

    // Server-side validation: Execute code to get real result
    // We ignore body.result and compute it ourselves
    const { userCode } = body;
    const duelId = req.params.id;

    // We need to fetch the problem to run against test cases
    const duel = await this._service.detail(duelId);
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });

    const problem = (duel as any).problem;
    // If problem is populated, we can use it. If it's just ID, we might need to fetch it?
    // Based on schemas, problem is ref 'Problem'. It might be populated by `detail`.
    // DuelService.detail calls `_duels.getById(id)`. Let's assume repository populates it or we need to check.

    // Actually, `_service.submitResult` logic in original code handles saving.
    // Ideally, we should move the execution logic INTO `_service.submitResult` or a new service method `submitSolution`.
    // But for this refactor, I will change `_service.submitResult` to take CODE, not RESULT.

    const updatedDuel = await this._service.submitSolution(duelId, currentUser.sub, userCode);
    if (!updatedDuel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })

    broadcastDuel(req.params.id, mapDuel(updatedDuel))
    res.json(mapDuel(updatedDuel))
  }

  /**
   * @desc    List active duels for user
   * @route   GET /api/duels/active
   * @req     -
   * @res     [Duel]
   */
  listActiveDuels = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.sub;
      const duels = await this._service.listActive(userId);
      res.json(duels.map(mapDuel));
    } catch (error: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  }

  /**
   * @desc    Cancel a duel
   * @route   POST /api/duels/:id/cancel
   * @req     params: { id }, body: { playerId }
   * @res     { duel }
   */
  cancelDuel = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const duel = await this._service.cancel(req.params.id, currentUser.sub)
    if (!duel) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    broadcastDuel(duel._id!, mapDuel(duel))
    res.json(mapDuel(duel))
  }
}
