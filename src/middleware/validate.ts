import { AnyZodObject } from 'zod'
import { Request, Response, NextFunction } from 'express'

export class ValidationMiddleware {
  private static instance: ValidationMiddleware;

  private constructor() { }

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  public validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ ...req.body, ...req.params, ...req.query })
    if (!parsed.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: parsed.error.issues })
    }
    next()
  }
}
