import { Response } from 'express';
import { HttpStatus } from '../constants';

/**
 * A standardized response structure for all API calls.
 */
interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  statusCode: number;
}

/**
 * A helper class to create and send standardized API responses.
 */
export class ApiResponse {
  /**
   * Sends a success response.
   * @param res - The Express Response object.
   * @param data - The payload to be sent.
   * @param message - A descriptive message.
   * @param statusCode - The HTTP status code.
   */
  public static success<T>(res: Response, data: T, message = 'Success', statusCode = HttpStatus.OK): void {
    const response: IApiResponse<T> = {
      success: true,
      message,
      data,
      statusCode,
    };
    res.status(statusCode).json(response);
  }

  /**
   * Sends an error response.
   * @param res - The Express Response object.
   * @param message - The error message.
   * @param statusCode - The HTTP status code.
   */
  public static error(res: Response, message = 'An error occurred', statusCode = HttpStatus.INTERNAL_SERVER_ERROR): void {
    const response: IApiResponse<null> = {
      success: false,
      message,
      data: null,
      statusCode,
    };
    res.status(statusCode).json(response);
  }
}
