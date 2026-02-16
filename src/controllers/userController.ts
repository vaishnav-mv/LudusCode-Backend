import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'
import { getErrorMessage } from '../utils/errorUtils'

import { HttpStatus, ResponseMessages } from '../constants'
import { ApiResponse } from '../utils/ApiResponse'
import { IUserService } from '../interfaces/services'
import { ICloudinaryProvider } from '../interfaces/providers'
import { UpdateProfileRequestDTO, ChangePasswordRequestDTO } from '../dto/request/user.request.dto'
import { mapUser } from '../utils/mapper'
import { User } from '../types'

@singleton()
export class UserController {
    constructor(
        @inject("IUserService") private _service: IUserService,
        @inject("ICloudinaryProvider") private _cloudinaryRepo: ICloudinaryProvider
    ) { }

    /**
     * @desc    Get user profile by ID
     * @route   GET /api/users/:id/profile
     * @req     params: { id }
     * @res     { user, recentDuels, joinedGroups, submissionStats }
     */
    profile = async (req: Request, res: Response) => {
        const userId = req.params.id;
        const userProfile = await this._service.profile(userId);
        if (!userProfile) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, userProfile);
    }

    /**
     * @desc    Upgrade user to premium
     * @route   PATCH /api/users/:id/premium
     * @req     params: { id }
     * @res     { user }
     */
    setPremium = async (req: Request, res: Response) => {
        const currentUser = req.user;
        if (!currentUser || !currentUser.isAdmin) {
            return ApiResponse.error(res, ResponseMessages.FORBIDDEN, HttpStatus.FORBIDDEN);
        }
        const userId = req.params.id;
        const updatedUser = await this._service.setPremium(userId);
        if (!updatedUser) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, updatedUser);
    }

    /**
     * @desc    Get global leaderboard
     * @route   GET /api/users/leaderboard/all
     * @req     -
     * @res     [User]
     */
    leaderboard = async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;
        const users = await this._service.leaderboard(page, limit);
        return ApiResponse.success(res, users.map(user => mapUser(user)));
    }

    /**
     * @desc    Update user profile
     * @route   PATCH /api/users/:id/profile
     * @req     params: { id }, body: { name }, file: avatar
     * @res     { user }
     */
    updateProfile = async (req: Request, res: Response) => {
        const userId = req.params.id;
        const currentUser = req.user;
        if (!currentUser || (!currentUser.isAdmin && currentUser.sub !== userId)) return ApiResponse.error(res, ResponseMessages.FORBIDDEN, HttpStatus.FORBIDDEN);

        const body = req.body as UpdateProfileRequestDTO & { avatarUrl?: string };

        let avatarUrl = body.avatarUrl;
        if (req.file) {
            try {
                avatarUrl = await this._cloudinaryRepo.uploadImage(req.file.path, 'avatars');
            } catch {
                return ApiResponse.error(res, ResponseMessages.FAILED_UPLOAD, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        const updateData: Partial<User> = {};
        if (body.name) updateData.username = body.name;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;

        const updatedUser = await this._service.updateProfile(userId, updateData);
        if (!updatedUser) return ApiResponse.error(res, ResponseMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
        return ApiResponse.success(res, { user: mapUser(updatedUser) });
    }

    /**
     * @desc    Change user password
     * @route   POST /api/users/change-password
     * @req     body: { oldPassword, newPassword }
     * @res     { message }
     */
    changePassword = async (req: Request, res: Response) => {
        const userId = req.user?.sub;
        if (!userId) return ApiResponse.error(res, ResponseMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
        const { oldPassword, newPassword } = req.body as ChangePasswordRequestDTO;
        try {
            await this._service.changePassword(userId, oldPassword, newPassword);
            return ApiResponse.success(res, null, 'Password updated successfully');
        } catch (e: unknown) {
            return ApiResponse.error(res, getErrorMessage(e), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * @desc    Search users by username or email
     * @route   GET /api/users/search
     * @req     query: { q }
     * @res     [User]
     */
    searchUsers = async (req: Request, res: Response) => {
        const query = req.query.q as string;
        if (!query || query.length < 2) {
            return ApiResponse.success(res, []);
        }
        const users = await this._service.search(query);
        return ApiResponse.success(res, users.map(user => mapUser(user)));
    }
}
