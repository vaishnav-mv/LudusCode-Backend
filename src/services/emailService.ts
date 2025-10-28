import { injectable } from 'tsyringe';
import nodemailer from 'nodemailer';
import config from '../config';
import { HttpStatus } from '../constants';
import logger from '../utils/logger';
import AppError from '../utils/AppError';
import { IEmailService } from '../interfaces/services/IEmailService';

@injectable()
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailSecure,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        logger.error('Email service error:', error);
      } else {
        logger.info('Email service is ready to send messages');
      }
    });
  }

  /**
   * Send OTP email to user
   * @param email User email
   * @param otp One-time password
   * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
   */
  public async sendOtpEmail(email: string, otp: string, purpose: string = 'verification'): Promise<boolean> {
    try {
      const subject = purpose === 'password-reset' 
        ? 'Reset Your LudusCode Password' 
        : 'Your LudusCode Verification Code';
      
      const mailOptions = {
        from: config.emailFrom,
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

      await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email} for ${purpose}`);
      return true;
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw new AppError('Failed to send verification email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

export default EmailService;