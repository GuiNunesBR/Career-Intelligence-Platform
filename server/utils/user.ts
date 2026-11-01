import { User, SanitizedUser } from '../../src/shared/types.js';

/**
 * Strips sensitive fields (passwordHash) from a User before returning it to
 * clients.
 */
export function sanitizeUser(user: User): SanitizedUser {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}
