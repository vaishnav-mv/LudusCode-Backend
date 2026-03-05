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
        this.router.post('/login', validate(LoginSchema), this._controller.login)
        this.router.post('/admin-login', this._controller.adminLogin)
        this.router.post('/register', validate(RegisterSchema), this._controller.register)
        this.router.post('/verify-otp', validate(VerifyOtpSchema), this._controller.verifyOtp)
        this.router.post('/resend-verification-otp', this._controller.resendVerificationOtp)
        this.router.post('/forgot-password', this._controller.forgotPassword)
        this.router.post('/reset-password', this._controller.resetPassword)
        this.router.post('/refresh', this._controller.refreshToken)
        this.router.post('/logout', this._controller.logout)
        this.router.get('/me', auth, this._controller.me)
        this.router.get('/google/start', this._controller.googleStart)
        this.router.get('/google/callback', this._controller.googleCallback)
        this.router.get('/github/start', this._controller.githubStart)
        this.router.get('/github/callback', this._controller.githubCallback)
    }
}
