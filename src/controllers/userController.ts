import { singleton, inject } from 'tsyringe'
import { Request, Response } from 'express'

import { HttpStatus, ResponseMessages } from '../constants'
import { IUserService, ICloudinaryService } from '../interfaces/services'
import { UpdateProfileRequestDTO, ChangePasswordRequestDTO } from '../dto/request/user.request.dto'

@singleton()
export class UserController {
    constructor(
        @inject("IUserService") private _service: IUserService,
        @inject("ICloudinaryService") private _cloudinaryService: ICloudinaryService
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
        if (!userProfile) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
        res.json(userProfile);
    }

    /**
     * @desc    Upgrade user to premium
     * @route   PATCH /api/users/:id/premium
     * @req     params: { id }
     * @res     { user }
     */
    setPremium = async (req: Request, res: Response) => {
        const currentUser = (req as any).user;
        if (!currentUser || !currentUser.isAdmin) {
            return res.status(HttpStatus.FORBIDDEN).json({ message: ResponseMessages.FORBIDDEN });
        }
        const userId = req.params.id;
        const updatedUser = await this._service.setPremium(userId);
        if (!updatedUser) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
        res.json(updatedUser);
    }

    /**
     * @desc    Get global leaderboard
     * @route   GET /api/users/leaderboard/all
     * @req     -
     * @res     [User]
     */
    leaderboard = async (req: Request, res: Response) => {
        const users = await this._service.leaderboard();
        res.json(users);
    }

    /**
     * @desc    Update user profile
     * @route   PATCH /api/users/:id/profile
     * @req     params: { id }, body: { name }, file: avatar
     * @res     { user }
     */
    updateProfile = async (req: Request, res: Response) => {
        const userId = req.params.id;
        const currentUser = (req as any).user;
        if (!currentUser || (!currentUser.isAdmin && currentUser.sub !== userId)) return res.status(HttpStatus.FORBIDDEN).json({ message: ResponseMessages.FORBIDDEN });

        let avatarUrl = req.body.avatarUrl;
        if (req.file) {
            try {
                avatarUrl = await this._cloudinaryService.uploadImage(req.file.path, 'avatars');
            } catch (error) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: ResponseMessages.FAILED_UPLOAD });
            }
        }

        const body = req.body as UpdateProfileRequestDTO;
        const updatedUser = await this._service.updateProfile(userId, { name: body.name, avatarUrl });
        if (!updatedUser) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
        res.json({ user: updatedUser });
    }

    /**
     * @desc    Change user password
     * @route   POST /api/users/change-password
     * @req     body: { oldPassword, newPassword }
     * @res     { message }
     */
    changePassword = async (req: Request, res: Response) => {
        const userId = (req as any).user.sub;
        const { oldPassword, newPassword } = req.body as ChangePasswordRequestDTO;
        try {
            await this._service.changePassword(userId, oldPassword, newPassword);
            res.json({ message: 'Password updated successfully' });
        } catch (e: any) {
            res.status(HttpStatus.BAD_REQUEST).json({ message: e.message });
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
            return res.json([]);
        }
        const users = await this._service.search(query);
        res.json(users);
    }
}
