import { singleton } from 'tsyringe'
import { IEmailProvider } from '../interfaces/providers'
import nodemailer from 'nodemailer'
import { env } from '../config/env'
import logger from '../utils/logger'

@singleton()
export class EmailProvider implements IEmailProvider {
    private _transporter: nodemailer.Transporter

    constructor() {
        this._transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
        })
    }

    async sendOtp(email: string, code: string): Promise<boolean> {
        try {
            logger.info(`[EmailProvider] Sending OTP to ${email}`)
            await this._transporter.sendMail({
                from: `"LudusCode Support" <${env.SMTP_USER}>`,
                to: email,
                subject: 'Your LudusCode Verification OTP',
                text: `Your OTP code is ${code}. It will expire in 10 minutes.`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>LudusCode Verification</h2>
                        <p>Your OTP code is: <strong style="font-size: 24px;">${code}</strong></p>
                        <p>It will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
                `,
            })
            return true
        } catch (error) {
            logger.error(`[EmailProvider] Error sending OTP to ${email}:`, error)
            return false
        }
    }
}
