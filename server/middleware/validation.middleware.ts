import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodIssue } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMsg = result.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: `Validation error: ${errorMsg}`,
        code: 'VALIDATION_FAILED',
        details: result.error.issues,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errorMsg = result.error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        error: `Query validation error: ${errorMsg}`,
        code: 'VALIDATION_FAILED',
        details: result.error.issues,
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
