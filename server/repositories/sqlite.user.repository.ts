import { createHash, randomBytes, randomUUID } from 'crypto';
import { and, eq, lt } from 'drizzle-orm';
import { IUserRepository } from './interfaces.js';
import { User, SanitizedUser, AuthSession } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';

/** Session lifetime; the client must log in again after this. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/** Only this hash is stored, so a leaked database does not leak usable tokens. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class SqliteUserRepository implements IUserRepository {
  async getAllUsers(): Promise<SanitizedUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return null;
    const u = result[0];
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) return null;
    const u = result[0];
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async createUser(email: string, name: string, passwordHash?: string, role?: string): Promise<User> {
    const id = `usr_${randomUUID()}`;
    const [u] = await db.insert(users).values({
      id,
      email,
      name,
      passwordHash: passwordHash || '',
      currentRole: role || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  async createSession(userId: string): Promise<AuthSession> {
    // 256 bits from the CSPRNG; the raw token is returned once and never stored
    const token = `sess_${randomBytes(32).toString('base64url')}`;
    const now = new Date();
    // Housekeeping: drop this user's expired sessions
    await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now.toISOString())));
    const [sess] = await db.insert(sessions).values({
      id: `sess_id_${randomUUID()}`,
      userId,
      tokenHash: hashSessionToken(token),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    }).returning();

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = userResult[0];

    return {
      token,
      userId: sess.userId,
      expiresAt: sess.expiresAt,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar || undefined,
        currentRole: u.currentRole,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }
    };
  }

  async getSession(token: string): Promise<AuthSession | null> {
    const tokenHash = hashSessionToken(token);
    const result = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    if (result.length === 0) return null;
    const sess = result[0];
    if (sess.revokedAt) return null;
    if (Date.parse(sess.expiresAt) <= Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, sess.id));
      return null;
    }
    const userResult = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
    if (userResult.length === 0) return null;
    const u = userResult[0];

    return {
      token,
      userId: sess.userId,
      expiresAt: sess.expiresAt,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar || undefined,
        currentRole: u.currentRole,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }
    };
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }
}
