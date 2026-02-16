import { singleton } from 'tsyringe'
import { IEmailProvider } from '../interfaces/providers'
import { env } from '../config/env'
import logger from '../utils/logger'
import nodemailer from 'nodemailer'

@singleton()
export class EmailProvider implements IEmailProvider {
    async sendOtp(email: string, code: string): Promise<boolean> {
        // TODO: Implement actual email sending logic
        console.log(`[EmailProvider] Sending OTP ${code} to ${email}`)
        return true
    }
}
