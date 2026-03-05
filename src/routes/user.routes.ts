import { Router } from 'express'
import { container } from 'tsyringe'
import { UserController } from '../controllers/userController'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { UpdateProfileSchema } from '../dto/request/user.request.dto'
import multer from 'multer'

const upload = multer({ dest: 'uploads/' })

export class UserRoutes {
    public router: Router;
    private _controller: UserController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(UserController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.get('/:id/profile', auth, this._controller.profile)
        this.router.patch('/:id/premium', auth, this._controller.setPremium)
        this.router.patch('/:id/profile', auth, upload.single('avatar'), validate(UpdateProfileSchema), this._controller.updateProfile)
        this.router.post('/change-password', auth, this._controller.changePassword)
        this.router.get('/leaderboard/all', auth, this._controller.leaderboard)
        this.router.get('/search', auth, this._controller.searchUsers)
    }
}
