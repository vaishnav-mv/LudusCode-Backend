import express from 'express';
import authController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, otpSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), authController.registerUser.bind(authController));
router.post('/login', validateRequest(loginSchema), authController.loginUser.bind(authController));
router.post('/verify-otp', validateRequest(otpSchema), authController.verifyUserOTP.bind(authController));
router.post('/resend-otp', authController.resendVerificationOtp.bind(authController));
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get('/profile', protect, authController.getUserProfile.bind(authController));
router.post('/logout', protect, authController.logout.bind(authController));

export default router;
