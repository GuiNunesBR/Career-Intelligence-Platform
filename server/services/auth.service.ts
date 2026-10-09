import bcrypt from 'bcryptjs';
import { IUserRepository } from '../repositories/interfaces.js';
import { sanitizeUser } from '../db.js';
import { SanitizedUser, AuthSession } from '../../src/shared/types.js';

const BCRYPT_COST = 12;
// Compared against when the email is unknown, so both paths take the same time
const DUMMY_HASH = bcrypt.hashSync('career-lake-timing-equalizer', BCRYPT_COST);

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async getAllUsers(): Promise<SanitizedUser[]> {
    return this.userRepo.getAllUsers();
  }

  async getUserById(id: string): Promise<SanitizedUser | null> {
    const user = await this.userRepo.getUserById(id);
    return user ? sanitizeUser(user) : null;
  }

  async login(credentials: { email?: string; password?: string }): Promise<{ session: AuthSession; user: SanitizedUser }> {
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error('Invalid credentials');
    }

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = await this.userRepo.getUserByEmail(normalizedEmail);

    // Always run one bcrypt comparison (async: does not block the event loop)
    const isValid = await bcrypt.compare(credentials.password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !isValid) {
      throw new Error('Invalid credentials');
    }

    const session = await this.userRepo.createSession(user.id);
    return { session, user: sanitizeUser(user) };
  }

  async register(email: string, name: string, password: string, role?: string): Promise<{ session: AuthSession; user: SanitizedUser }> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.userRepo.getUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await this.userRepo.createUser(normalizedEmail, name, passwordHash, role || 'Professional');
    const session = await this.userRepo.createSession(user.id);
    return { session, user: sanitizeUser(user) };
  }

  async verifySession(token: string): Promise<SanitizedUser | null> {
    const session = await this.userRepo.getSession(token);
    if (!session) return null;
    const user = await this.userRepo.getUserById(session.userId);
    if (!user) return null;
    return sanitizeUser(user);
  }

  async logout(token: string): Promise<void> {
    await this.userRepo.deleteSession(token);
  }
}
