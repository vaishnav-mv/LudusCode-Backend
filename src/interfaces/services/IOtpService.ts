/**
 * Interface for OTP service operations
 */
export interface IOtpService {
  /**
   * Generate a new OTP for a user
   * @param email User's email address
   * @param purpose Purpose of the OTP (e.g., 'verification', 'password-reset')
   * @returns The generated OTP code
   */
  generateOtp(email: string, purpose?: string): Promise<string>;

  /**
   * Verify an OTP for a user
   * @param email User's email address
   * @param code OTP code to verify
   * @param purpose Purpose of the OTP
   * @returns Boolean indicating if OTP is valid
   */
  verifyOtp(email: string, code: string, purpose?: string): Promise<boolean>;

  /**
   * Invalidate an existing OTP
   * @param email User's email address
   * @param purpose Purpose of the OTP
   */
  invalidateOtp(email: string, purpose?: string): Promise<void>;
}
