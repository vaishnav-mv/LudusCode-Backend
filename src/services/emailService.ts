import { singleton } from 'tsyringe'
import { IEmailService } from '../interfaces/services'

@singleton()
export class EmailService implements IEmailService {
    async sendOtp(email: string, code: string): Promise<boolean> {
        // TODO: Implement actual email sending logic
        console.log(`[EmailService] Sending OTP ${code} to ${email}`)
        return true
    }
}
