import { Router } from 'express'
import { container } from 'tsyringe'
import { AuthController } from '../controllers/authController'
import { ValidationMiddleware } from '../middleware/validate'
const validate = container.resolve(ValidationMiddleware).validate
import { LoginSchema, RegisterSchema, VerifyOtpSchema } from '../dto/request/auth.request.dto'
import { AuthMiddleware } from '../middleware/auth'
const auth = container.resolve(AuthMiddleware).auth

export class AuthRoutes {
    public router: Router;
    private _controller: AuthController;

    constructor() {
        this.router = Router();
        this._controller = container.resolve(AuthController);
        this.setupRoutes();
    }

    private setupRoutes() {
        this.router.post('/login', validate(LoginSchema), (req, res, next) => this._controller.login(req, res).catch(next))
        this.router.post('/admin-login', (req, res, next) => this._controller.adminLogin(req, res).catch(next))
        this.router.post('/register', validate(RegisterSchema), (req, res, next) => this._controller.register(req, res).catch(next))
        this.router.post('/verify-otp', validate(VerifyOtpSchema), (req, res, next) => this._controller.verifyOtp(req, res).catch(next))
        this.router.post('/resend-verification-otp', (req, res, next) => this._controller.resendVerificationOtp(req, res).catch(next))
        this.router.post('/forgot-password', (req, res, next) => this._controller.forgotPassword(req, res).catch(next))
        this.router.post('/reset-password', (req, res, next) => this._controller.resetPassword(req, res).catch(next))
        this.router.post('/refresh', (req, res, next) => this._controller.refreshToken(req, res).catch(next))
        this.router.post('/logout', (req, res, next) => this._controller.logout(req, res).catch(next))
        this.router.get('/me', auth, (req, res, next) => this._controller.me(req, res).catch(next))
        this.router.get('/google/start', (req, res, next) => this._controller.googleStart(req, res).catch(next))
        this.router.get('/google/callback', (req, res, next) => this._controller.googleCallback(req, res).catch(next))
        this.router.get('/github/start', (req, res, next) => this._controller.githubStart(req, res).catch(next))
        this.router.get('/github/callback', (req, res, next) => this._controller.githubCallback(req, res).catch(next))
    }
}
