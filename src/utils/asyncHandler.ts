import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async express route to automatically catch any rejected Promises
 * and forward them to the global Express next() error handler.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
