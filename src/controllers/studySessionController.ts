import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { IStudySessionService } from '../interfaces/services'
import { getErrorMessage } from '../utils/errorUtils'

@singleton()
export class StudySessionController {
    constructor(
        @inject("IStudySessionService") private _service: IStudySessionService
    ) { }

    /**
     * @desc    Create a new study session
     * @route   POST /api/study-sessions
     * @req     body: { groupId, title, description, mode, startTime, durationMinutes, problems }
     * @res     { session }
     */
    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.sub
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            const session = await this._service.create({ ...req.body, userId })
            res.status(201).json(session)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
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
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            const session = await this._service.update(id, userId, req.body)
            res.json(session)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
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
            res.json(sessions)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
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
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            const session = await this._service.join(id, userId)
            res.json(session)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
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
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            const session = await this._service.leave(id, userId)
            res.json(session)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
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
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            // We verify access inside the service
            const session = await this._service.getByIdSecure(id, userId);
            if (!session) return res.status(404).json({ message: 'Session not found' });
            res.json(session)
        } catch (e: unknown) {
            const msg = getErrorMessage(e);
            if (msg.includes('authorized') || msg.includes('member')) {
                return res.status(403).json({ message: msg });
            }
            res.status(400).json({ message: msg })
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
            if (!userId) return res.status(401).json({ message: 'Unauthorized' })
            const session = await this._service.passTurn(id, userId)
            res.json(session)
        } catch (e: unknown) {
            res.status(400).json({ message: getErrorMessage(e) })
        }
    }
}
