"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const tsyringe_1 = require("tsyringe");
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const constants_1 = require("../constants");
const logger_1 = __importDefault(require("../utils/logger"));
const AppError_1 = __importDefault(require("../utils/AppError"));
let EmailService = class EmailService {
    constructor() {
        this._transporter = nodemailer_1.default.createTransport({
            host: config_1.default.emailHost,
            port: config_1.default.emailPort,
            secure: config_1.default.emailSecure,
            auth: {
                user: config_1.default.emailUser,
                pass: config_1.default.emailPassword,
            },
        });
        // Verify connection configuration
        this._transporter.verify((error) => {
            if (error) {
                logger_1.default.error('Email service error:', error);
            }
            else {
                logger_1.default.info('Email service is ready to send messages');
            }
        });
    }
    /**
     * Send OTP email to user
     * @param email User email
     * @param otp One-time password
     * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
     */
    async sendOtpEmail(email, otp, purpose = 'verification') {
        try {
            const subject = purpose === 'password-reset'
                ? 'Reset Your LudusCode Password'
                : 'Your LudusCode Verification Code';
            const mailOptions = {
                from: config_1.default.emailFrom,
                to: email,
                subject,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>LudusCode ${purpose === 'password-reset' ? 'Password Reset' : 'Verification'}</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background-color: #f4f4f4; padding: 10px; text-align: center;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
            };
            await this._transporter.sendMail(mailOptions);
            logger_1.default.info(`OTP email sent to ${email} for ${purpose}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error sending OTP email:', error);
            throw new AppError_1.default('Failed to send verification email', constants_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
exports.default = EmailService;
