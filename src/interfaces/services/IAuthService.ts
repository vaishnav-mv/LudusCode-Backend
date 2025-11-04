import { AuthenticatedUserDTO } from '../../dto/response/AuthResponseDTO';
import { IUser } from '../../types/models';

export interface IAuthService {
  registerUser(
    userData: Pick<IUser, 'username' | 'name' | 'email' | 'password'>
  ): Promise<{ message: string }>;
  verifyUserOTP(
    email: string,
    otp: string
  ): Promise<{ message: string } & AuthenticatedUserDTO>;
  resendVerificationOtp(email: string): Promise<{ message: string }>;
  refreshToken(refreshToken: string): Promise<AuthenticatedUserDTO>;
  loginUser(email: string, password: string): Promise<AuthenticatedUserDTO>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ message: string }>;
}
