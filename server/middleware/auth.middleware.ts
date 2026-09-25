import { Request, Response, NextFunction } from 'express';
import { authService } from '../container.js';
import { User } from '../../src/shared/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Empty token provided',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  try {
    const user = await authService.verifySession(token);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized: Session invalid or expired',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    // Set the validated user on the request
    req.user = user as any;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Unauthorized: Session verification failed',
      code: 'SESSION_ERROR',
    });
  }
}
