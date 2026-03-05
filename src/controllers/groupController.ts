import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IGroupService } from '../interfaces/services'
import { CreateGroupDTO, UpdateGroupDTO, GroupMemberActionDTO, AddMemberDTO } from '../dto/request/group.request.dto'
import { asyncHandler } from "../utils/asyncHandler";

@singleton()
export class GroupController {
  constructor(@inject("IGroupService") private _service: IGroupService) { }

  /**
   * @desc    Create a new group
   * @route   POST /api/groups
   * @req     body: { name, description,topics }
   * @res     { group }
   */
  createGroup = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const body = req.body as CreateGroupDTO
    const createdGroup = await this._service.create(body.name, body.description || '', body.topics || [], currentUser?.sub as string, !!body.isPrivate)
    return ApiResponse.success(res, createdGroup, 'Group created', HttpStatus.CREATED)
  })

  /**
   * @desc    Update a group
   * @route   PATCH /api/groups/:id
   * @req     params: { id }, body: { name, description }
   * @res     { group }
   */
  updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const body = req.body as UpdateGroupDTO
    const updated = await this._service.update(req.params.id, currentUser?.sub as string, {
      name: body.name,
      description: body.description
    })
    if (!updated) return ApiResponse.error(res, ResponseMessages.GROUP_NOT_FOUND, HttpStatus.NOT_FOUND)
    return ApiResponse.success(res, updated)
  })

  /**
   * @desc    List all groups
   * @route   GET /api/groups
   * @req     -
   * @res     [Group]
   */
  listGroups = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user;
    const { q, sort, isPrivate, page, limit } = req.query;
    const result = await this._service.list(currentUser?.sub, {
      query: q as string,
      sort: sort as string,
      isPrivate: isPrivate as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    })
    return ApiResponse.success(res, result)
  })

  /**
   * @desc    Get group details
   * @route   GET /api/groups/:id
   * @req     params: { id }
   * @res     { group }
   */
  groupDetail = asyncHandler(async (req: Request, res: Response) => {
    const group = await this._service.detail(req.params.id)
    if (!group) {
      return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return ApiResponse.success(res, group)
  })

  /**
   * @desc    Join a group
   * @route   POST /api/groups/:id/join
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  joinGroup = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const ok = await this._service.join(req.params.id, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Leave a group
   * @route   POST /api/groups/:id/leave
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  leaveGroup = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)

    const ok = await this._service.leave(req.params.id, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Approve a join request
   * @route   POST /api/groups/:id/approve
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  approveGroupJoin = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.approveJoin(req.params.id, body.userId, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Reject a join request
   * @route   POST /api/groups/:id/reject
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  rejectGroupJoin = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.rejectJoin(req.params.id, body.userId, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Kick a member
   * @route   POST /api/groups/:id/kick
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  kickGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.kickMember(req.params.id, body.userId, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Delete a group
   * @route   DELETE /api/groups/:id
   * @req     params: { id }
   * @res     { ok: boolean }
   */
  deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const ok = await this._service.delete(req.params.id, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Block a member
   * @route   POST /api/groups/:id/block
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  blockGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as GroupMemberActionDTO
    const ok = await this._service.blockMember(req.params.id, body.userId, userId)
    return ApiResponse.success(res, { ok })
  })

  /**
   * @desc    Add a member to a group (Private)
   * @route   POST /api/groups/:id/members
   * @req     params: { id }, body: { userId }
   * @res     { ok: boolean }
   */
  addGroupMember = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.user
    const userId = currentUser?.sub || currentUser?.id || currentUser?._id?.toString() || '';
    if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED)
    const body = req.body as AddMemberDTO
    const ok = await this._service.addMember(req.params.id, body.userId, userId)
    return ApiResponse.success(res, { ok })
  })
}
