/**
 * Interface for email service operations
 */
export interface IEmailService {
  /**
   * Send OTP email to user
   * @param email User email address
   * @param otp One-time password
   * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
   * @returns Promise<boolean> indicating success
   */
  sendOtpEmail(email: string, otp: string, purpose?: string): Promise<boolean>;
}