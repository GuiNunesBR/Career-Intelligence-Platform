import { db, sanitizeUser } from '../db.js';
import { User, SanitizedUser, AuthSession } from '../../src/shared/types.js';
import { IUserRepository } from './interfaces.js';

export class UserRepository implements IUserRepository {
  async getAllUsers(): Promise<SanitizedUser[]> {
    return db.getUsers().map(sanitizeUser);
  }

  async getUserById(id: string): Promise<User | null> {
    return db.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return db.getUserByEmail(email);
  }

  async createUser(email: string, name: string, passwordHash?: string, role?: string): Promise<User> {
    return db.createUser(email, name, passwordHash, role || 'Professional');
  }

  async createSession(userId: string): Promise<AuthSession> {
    return db.createSession(userId);
  }

  async getSession(token: string): Promise<AuthSession | null> {
    return db.getSession(token);
  }

  async deleteSession(token: string): Promise<void> {
    db.revokeSession(token);
  }
}

export const userRepository = new UserRepository();
