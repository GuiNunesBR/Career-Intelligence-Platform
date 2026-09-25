import bcrypt from 'bcryptjs';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { sanitizeUser } from '../db.js';
import { User, SanitizedUser, AuthSession } from '../../src/shared/types.js';

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  getAllUsers(): SanitizedUser[] {
    return this.userRepo.getAllUsers();
  }

  getUserById(id: string): SanitizedUser | null {
    const user = this.userRepo.getUserById(id);
    return user ? sanitizeUser(user) : null;
  }

  login(credentials: { email?: string; password?: string }): { session: AuthSession; user: SanitizedUser } {
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error('Invalid credentials');
    }

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = this.userRepo.getUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password via bcrypt
    const isValid = bcrypt.compareSync(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const session = this.userRepo.createSession(user.id);
    return { session, user: sanitizeUser(user) };
  }

  register(email: string, name: string, password: string, role?: string): { session: AuthSession; user: SanitizedUser } {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.userRepo.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = this.userRepo.createUser(normalizedEmail, name, passwordHash, role || 'Professional');
    const session = this.userRepo.createSession(user.id);
    return { session, user: sanitizeUser(user) };
  }

  verifySession(token: string): SanitizedUser | null {
    const session = this.userRepo.getSession(token);
    if (!session) return null;
    return session.user;
  }

  logout(token: string): void {
    this.userRepo.deleteSession(token);
  }
}

export const authService = new AuthService();
