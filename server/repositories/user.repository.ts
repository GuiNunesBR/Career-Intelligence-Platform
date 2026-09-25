import { db, sanitizeUser } from '../db.js';
import { User, SanitizedUser, AuthSession } from '../../src/shared/types.js';
import { IUserRepository } from './interfaces.js';

export class UserRepository implements IUserRepository {
  getAllUsers(): SanitizedUser[] {
    return db.getUsers().map(sanitizeUser);
  }

  getUserById(id: string): User | null {
    return db.getUserById(id);
  }

  getUserByEmail(email: string): User | null {
    return db.getUserByEmail(email);
  }

  createUser(email: string, name: string, passwordHash?: string, role?: string): User {
    return db.createUser(email, name, passwordHash, role || 'Professional');
  }

  createSession(userId: string): AuthSession {
    return db.createSession(userId);
  }

  getSession(token: string): AuthSession | null {
    return db.getSession(token);
  }

  deleteSession(token: string): void {
    db.revokeSession(token);
  }
}

export const userRepository = new UserRepository();
