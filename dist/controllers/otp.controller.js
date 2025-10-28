"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const di_1 = __importDefault(require("../di"));
const logger_1 = __importDefault(require("../utils/logger"));
class OtpController {
    constructor() {
        /**
         * Send OTP to user's email
         */
        this.sendOtp = async (req, res) => {
            try {
                const { email } = req.body;
                if (!email) {
                    return res.status(400).json({ success: false, message: 'Email is required' });
                }
                // Generate and store OTP via OtpService
                const otp = await this._otpService.generateOtp(email, 'verification');
                // Send OTP email
                const sent = await this._emailService.sendOtpEmail(email, otp, 'verification');
                if (!sent) {
                    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
                }
                return res.status(200).json({
                    success: true,
                    message: 'OTP sent successfully',
                    data: { email }
                });
            }
            catch (error) {
                logger_1.default.error('Error sending OTP:', error);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        };
        /**
         * Verify OTP provided by user
         */
        this.verifyOtp = async (req, res) => {
            try {
                const { email, otp } = req.body;
                if (!email || !otp) {
                    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
                }
                // Verify OTP via OtpService
                const isValid = await this._otpService.verifyOtp(email, otp, 'verification');
                if (!isValid) {
                    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
                }
                return res.status(200).json({
                    success: true,
                    message: 'OTP verified successfully',
                    data: { email, verified: true }
                });
            }
            catch (error) {
                logger_1.default.error('Error verifying OTP:', error);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        };
        this._emailService = di_1.default.resolve('IEmailService');
        this._otpService = di_1.default.resolve('IOtpService');
    }
}
const otpController = new OtpController();
exports.default = otpController;
