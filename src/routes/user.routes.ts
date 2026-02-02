import { Router } from 'express'
import { container } from 'tsyringe'
import { UserController } from '../controllers/userController'
import { AuthMiddleware } from '../middleware/auth'
const auth = AuthMiddleware.getInstance().auth
import { ValidationMiddleware } from '../middleware/validate'
const validate = ValidationMiddleware.getInstance().validate
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
        this.router.get('/:id/profile', auth, (req, res, next) => this._controller.profile(req, res).catch(next))
        this.router.patch('/:id/premium', auth, (req, res, next) => this._controller.setPremium(req, res).catch(next))
        this.router.patch('/:id/profile', auth, upload.single('avatar'), validate(UpdateProfileSchema), (req, res, next) => this._controller.updateProfile(req, res).catch(next))
        this.router.post('/change-password', auth, (req, res, next) => this._controller.changePassword(req, res).catch(next))
        this.router.get('/leaderboard/all', auth, (req, res, next) => this._controller.leaderboard(req, res).catch(next))
        this.router.get('/search', auth, (req, res, next) => this._controller.searchUsers(req, res).catch(next))
    }
}
