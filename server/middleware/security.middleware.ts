import { Request, Response, NextFunction } from 'express';

// Simple sliding window in-memory rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore: Map<string, RateLimitBucket> = new Map();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitStore.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
        },
      });
      return;
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter(20, 60000); // 20 requests per minute
export const aiRateLimiter = createRateLimiter(30, 60000); // 30 requests per minute

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}
