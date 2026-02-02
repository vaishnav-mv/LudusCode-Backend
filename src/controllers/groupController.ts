import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { HttpStatus, ResponseMessages } from '../constants'
import { IGroupService } from '../interfaces/services'
import { CreateGroupDTO, UpdateGroupDTO, GroupMemberActionDTO, AddMemberDTO } from '../dto/request/group.request.dto'

@singleton()
export class GroupController {
  constructor(@inject("IGroupService") private _service: IGroupService) { }

  /**
   * @desc    Create a new group
   * @route   POST /api/groups
   * @req     body: { name, description,topics }
   * @res     { group }
   */
  createGroup = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as CreateGroupDTO
    // Fix: Ensure description is a string
    const createdGroup = await this._service.create(body.name, body.description || '', body.topics || [], currentUser?.sub as string, !!body.isPrivate)
    res.json(createdGroup)
  }

  /**
   * @desc    Update a group
   * @route   PATCH /api/groups/:id
   * @req     params: { id }, body: { name, description }
   * @res     { group }
   */
  updateGroup = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as UpdateGroupDTO
    try {
      const updated = await this._service.update(req.params.id, currentUser?.sub as string, {
        name: body.name,
        description: body.description
      })
      if (!updated) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.GROUP_NOT_FOUND })
      res.json(updated)
    } catch (e: any) {
      if (e.message.includes('Forbidden')) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: e.message })
      }
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message || ResponseMessages.INTERNAL_ERROR })
    }
  }

  /**
   * @desc    List all groups
   * @route   GET /api/groups
   * @req     -
   * @res     [Group]
   */
  listGroups = async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user;
      const { q, sort, isPrivate, page, limit } = req.query;
      const groups = await this._service.list(currentUser?.sub, {
        q: q as string,
        sort: sort as string,
        isPrivate: isPrivate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      })
      console.log(`[GroupController] Listing groups. Found: ${groups.length}`);
      res.json(groups);
    } catch (err) {
      console.error('GroupController: Error listing groups:', err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ResponseMessages.INTERNAL_ERROR });
    }
  }

  /**
   * @desc    Get group details
   * @route   GET /api/groups/:id
   * @req     params: { id }
   * @res     { group }
   */
  groupDetail = async (req: Request, res: Response) => {
    const group = await this._service.detail(req.params.id)
    if (!group) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND })
    }
    res.json(group)
  }

  /**
   * @desc    Join a group
   * @route   POST /api/groups/:id/join
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  joinGroup = async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user
      if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
      const body = req.body as GroupMemberActionDTO
      const ok = await this._service.join(req.params.id, currentUser.sub)
      res.json({ ok })
    } catch (e: any) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message || ResponseMessages.FAILED_JOIN })
    }
  }

  /**
   * @desc    Leave a group
   * @route   POST /api/groups/:id/leave
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  leaveGroup = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    if (!currentUser) return res.status(HttpStatus.UNAUTHORIZED).json({ message: ResponseMessages.UNAUTHORIZED })
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.leave(req.params.id, currentUser.sub)
    res.json({ ok })
  }

  /**
   * @desc    Approve a join request
   * @route   POST /api/groups/:id/approve
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  approveGroupJoin = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.approveJoin(req.params.id, body.userId, currentUser?.sub as string)
    res.json({ ok })
  }

  /**
   * @desc    Reject a join request
   * @route   POST /api/groups/:id/reject
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  rejectGroupJoin = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.rejectJoin(req.params.id, body.userId, currentUser?.sub as string)
    res.json({ ok })
  }

  /**
   * @desc    Kick a member
   * @route   POST /api/groups/:id/kick
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  kickGroupMember = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.kickMember(req.params.id, body.userId, currentUser?.sub as string)
    res.json({ ok })
  }

  /**
   * @desc    Delete a group
   * @route   DELETE /api/groups/:id
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  deleteGroup = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const ok = await this._service.delete(req.params.id, currentUser?.sub as string)
    res.json({ ok })
  }

  /**
   * @desc    Block a member
   * @route   POST /api/groups/:id/block
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  blockGroupMember = async (req: Request, res: Response) => {
    const currentUser = (req as any).user
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.blockMember(req.params.id, body.userId, currentUser?.sub as string)
    res.json({ ok })
  }

  /**
   * @desc    Add a member to a group (Private)
   * @route   POST /api/groups/:id/members
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  addGroupMember = async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).user
      const body = req.body as AddMemberDTO
      const ok = await this._service.addMember(req.params.id, body.userId, currentUser?.sub as string)
      res.json({ ok })
    } catch (e: any) {
      if (e.message.includes('Forbidden')) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: e.message })
      }
      res.status(HttpStatus.BAD_REQUEST).json({ message: e.message || ResponseMessages.FAILED_JOIN })
    }
  }
}
