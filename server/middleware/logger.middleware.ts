import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export function structuredLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?.id || 'unauthenticated';
    const status = res.statusCode;

    // Structured production-ready log (sanitized, zero secrets)
    console.log(
      `[API] method=${req.method} path=${req.originalUrl || req.url} status=${status} duration=${duration}ms userId=${userId}`
    );
  });

  next();
}
