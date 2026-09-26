import { eq } from 'drizzle-orm';
import { IUserRepository } from './interfaces.js';
import { User, SanitizedUser, AuthSession } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { users, sessions } from '../db/schema.js';

export class PgUserRepository implements IUserRepository {
  async getAllUsers(): Promise<SanitizedUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
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
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
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
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  async createUser(email: string, name: string, passwordHash?: string, role?: string): Promise<User> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const [u] = await db.insert(users).values({
      id,
      email,
      name,
      passwordHash: passwordHash || '',
      currentRole: role || 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      name: u.name,
      avatar: u.avatar || undefined,
      currentRole: u.currentRole,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  async createSession(userId: string): Promise<AuthSession> {
    const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const [sess] = await db.insert(sessions).values({
      id: `sess_id_${Date.now()}`,
      userId,
      tokenHash: token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    }).returning();

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = userResult[0];

    return {
      token: sess.tokenHash,
      userId: sess.userId,
      expiresAt: sess.expiresAt.toISOString(),
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar || undefined,
        currentRole: u.currentRole,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }
    };
  }

  async getSession(token: string): Promise<AuthSession | null> {
    const result = await db.select().from(sessions).where(eq(sessions.tokenHash, token)).limit(1);
    if (result.length === 0) return null;
    const sess = result[0];
    if (sess.revokedAt) return null;
    const userResult = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
    if (userResult.length === 0) return null;
    const u = userResult[0];

    return {
      token: sess.tokenHash,
      userId: sess.userId,
      expiresAt: sess.expiresAt.toISOString(),
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar || undefined,
        currentRole: u.currentRole,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }
    };
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.tokenHash, token));
  }
}
