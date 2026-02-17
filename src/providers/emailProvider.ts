import { singleton } from 'tsyringe'
import { IEmailProvider } from '../interfaces/providers'


@singleton()
export class EmailProvider implements IEmailProvider {
    async sendOtp(email: string, code: string): Promise<boolean> {
        // TODO: Implement actual email sending logic
        console.log(`[EmailProvider] Sending OTP ${code} to ${email}`)
        return true
    }
}
