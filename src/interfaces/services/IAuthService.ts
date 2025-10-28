import { IUser } from '../../types/models';

export interface IAuthService {
  registerUser(
    userData: Pick<IUser, 'username' | 'email' | 'password'>
  ): Promise<{ message: string }>;
  verifyUserOTP(
    email: string,
    otp: string
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: Pick<IUser, '_id' | 'email' | 'username' | 'role' | 'isVerified'>;
  }>;
  refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; user: Pick<IUser, '_id' | 'email' | 'username' | 'role'> }>;
  loginUser(
    email: string,
    password: string
  ): Promise<{ user: Omit<IUser, 'password'>; accessToken: string; refreshToken: string }>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ message: string }>;
}
