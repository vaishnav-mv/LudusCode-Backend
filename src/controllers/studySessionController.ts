import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { IStudySessionService } from '../interfaces/services'
import { getErrorMessage } from '../utils/errorUtils'
import { ApiResponse } from '../utils/ApiResponse'
import { HttpStatus } from '../constants'

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
    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            console.log('Study Session Create Payload:', req.body);
            const session = await this._service.create({ ...req.body, userId })
            return ApiResponse.success(res, session, "Session created", HttpStatus.CREATED)
        } catch (error: unknown) {
            console.error('Study Session Create Error:', error);
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Update a study session
     * @route   PUT /api/study-sessions/:id
     * @req     params: { id }, body: { title, description, ... }
     * @res     { session }
     */
    update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            const session = await this._service.update(id, userId, req.body)
            return ApiResponse.success(res, session)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    List study sessions for a group
     * @route   GET /api/study-sessions/group/:groupId
     * @req     params: { groupId }, query: { page, limit, status, sort, q }
     * @res     [Session]
     */
    list = async (req: Request, res: Response) => {
        try {
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
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Join a study session
     * @route   POST /api/study-sessions/:id/join
     * @req     params: { id }
     * @res     { session }
     */
    join = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            const session = await this._service.join(id, userId)
            return ApiResponse.success(res, session)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Leave a study session
     * @route   POST /api/study-sessions/:id/leave
     * @req     params: { id }
     * @res     { session }
     */
    leave = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            const session = await this._service.leave(id, userId)
            return ApiResponse.success(res, session)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Get study session details
     * @route   GET /api/study-sessions/:id
     * @req     params: { id }
     * @res     { session }
     */
    detail = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            // We verify access inside the service
            const session = await this._service.getByIdSecure(id, userId);
            if (!session) return ApiResponse.error(res, 'Session not found', HttpStatus.NOT_FOUND)
            return ApiResponse.success(res, session)
        } catch (error: unknown) {
            const msg = getErrorMessage(error);
            if (msg.includes('authorized') || msg.includes('member')) {
                return ApiResponse.error(res, msg, HttpStatus.FORBIDDEN)
            }
            return ApiResponse.error(res, msg, HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * @desc    Pass turn in round-robin mode
     * @route   POST /api/study-sessions/:id/pass-turn
     * @req     params: { id }
     * @res     { session }
     */
    passTurn = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const userId = req.user?.sub
            if (!userId) return ApiResponse.error(res, 'Unauthorized', HttpStatus.UNAUTHORIZED)
            const session = await this._service.passTurn(id, userId)
            return ApiResponse.success(res, session)
        } catch (error: unknown) {
            return ApiResponse.error(res, getErrorMessage(error), HttpStatus.BAD_REQUEST)
        }
    }
}
