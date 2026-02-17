import { Response } from 'express';
import { HttpStatus } from '../constants';

export class ApiResponse {
    static success(res: Response, data: unknown = null, message: string = 'Success', statusCode: number = HttpStatus.OK) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static error(res: Response, message: string = 'Error', statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, errors: unknown = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            errors,
        });
    }
}
