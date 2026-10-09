import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

// Fixed-window in-memory rate limiter. Keyed by user when the route is authenticated
// (place it after authMiddleware), otherwise by client IP. Single-instance only.
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore: Map<string, RateLimitBucket> = new Map();

// Drop expired buckets so the map does not grow without bound
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore) if (bucket.resetAt <= now) rateLimitStore.delete(key);
}, 60_000);
sweep.unref();

export function createRateLimiter(name: string, maxRequests: number, windowMs: number, message: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const who = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const key = `${name}:${who}`;
    const now = Date.now();

    let bucket = rateLimitStore.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', message } });
      return;
    }

    next();
  };
}

/** Login/register: slows down password guessing and account creation from one IP. */
export const authRateLimiter = createRateLimiter(
  'auth',
  10,
  15 * 60_000,
  'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
);

/** Routes that call the LLM or start a scraping run (each call costs quota). */
export const aiRateLimiter = createRateLimiter(
  'ai',
  40,
  60 * 60_000,
  'Limite de uso de IA atingido (40 por hora). Aguarde um pouco e tente novamente.'
);

/** PDF rendering and ATS re-reading (headless Chrome is expensive). */
export const renderRateLimiter = createRateLimiter(
  'render',
  30,
  10 * 60_000,
  'Muitas gerações de PDF seguidas. Aguarde alguns minutos.'
);

const isProduction = process.env.NODE_ENV === 'production';

// The SPA only loads its own bundle plus Google Fonts; everything else is same-origin.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // Legacy XSS auditor is unsafe in old browsers; CSP replaces it
  res.setHeader('X-XSS-Protection', '0');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
