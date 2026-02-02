import { AnyZodObject } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { singleton } from 'tsyringe'

@singleton()
export class ValidationMiddleware {
  constructor() { }

  public validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ ...req.body, ...req.params, ...req.query })
    if (!parsed.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: parsed.error.issues })
    }
    next()
  }
}
