import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { IStudySessionService } from '../interfaces/services'
import { ApiResponse } from '../utils/ApiResponse'
import { HttpStatus } from '../constants'
import { asyncHandler } from "../utils/asyncHandler";
import logger from '../utils/logger';

@singleton()
export class StudySessionController {
    constructor(
        @inject("IStudySessionService") private _service: IStudySessionService
    ) { }

    /**
     * @desc    Create a new study session
     * @route   POST /api/study-sessions
     * @req     body: { groupId, title, description, mode, startTime, durationMinutes }
     * @res     { session }
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        logger.debug('Study Session Create Payload:', req.body);
        const session = await this._service.create({ ...req.body, userId })
        return ApiResponse.success(res, session, "Session created", HttpStatus.CREATED)
    })

    /**
     * @desc    Update a study session
     * @route   PUT /api/study-sessions/:id
     * @req     params: { id }, body: { title, description, ... }
     * @res     { session }
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        const session = await this._service.update(id, userId, req.body)
        return ApiResponse.success(res, session)
    })

    /**
     * @desc    List study sessions for a group
     * @route   GET /api/study-sessions/group/:groupId
     * @req     params: { groupId }, query: { page, limit, status, sort, q }
     * @res     [Session]
     */
    list = asyncHandler(async (req: Request, res: Response) => {
        const { groupId } = req.params;
        const query = req.query as { page?: string, limit?: string, status?: string, sort?: string, q?: string };
        const { page = '1', limit = '20', status, sort, q } = query;
        const sessions = await this._service.list(
            groupId,
            parseInt(page),
            parseInt(limit),
            { status, sort, query: q }
        )
        return ApiResponse.success(res, sessions)
    })

    /**
     * @desc    Join a study session
     * @route   POST /api/study-sessions/:id/join
     * @req     params: { id }
     * @res     { session }
     */
    join = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        const session = await this._service.join(id, userId)
        return ApiResponse.success(res, session)
    })

    /**
     * @desc    Leave a study session
     * @route   POST /api/study-sessions/:id/leave
     * @req     params: { id }
     * @res     { session }
     */
    leave = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        const session = await this._service.leave(id, userId)
        return ApiResponse.success(res, session)
    })

    /**
     * @desc    Get study session details
     * @route   GET /api/study-sessions/:id
     * @req     params: { id }
     * @res     { session }
     */
    detail = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        const session = await this._service.getByIdSecure(id, userId);
        if (!session) return ApiResponse.error(res, 'Session not found', HttpStatus.NOT_FOUND)
        return ApiResponse.success(res, session)
    })

    /**
     * @desc    Pass turn in round-robin mode
     * @route   POST /api/study-sessions/:id/pass-turn
     * @req     params: { id }
     * @res     { session }
     */
    passTurn = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params
        const userId = req.user?.sub
        if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
        const session = await this._service.passTurn(id, userId)
        return ApiResponse.success(res, session)
    })
}
