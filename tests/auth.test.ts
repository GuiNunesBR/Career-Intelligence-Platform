import assert from 'assert';
import { authService } from '../server/container.js';
import { LoginSchema } from '../server/validation/schemas.js';
import { eq } from 'drizzle-orm';
import { db } from '../server/db/index.js';
import { sessions } from '../server/db/schema.js';
import { hashSessionToken } from '../server/repositories/sqlite.user.repository.js';

export async function runAuthTests(): Promise<void> {
  console.log('  [TEST SUITE] Auth & Identity Hardening');

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1. Register Valid
  const regResult = await authService.register(testEmail, 'Carlos Teste', testPassword, 'Lead Architect');
  const sessionResult = await authService.login({ email: testEmail, password: testPassword });
  assert.ok(sessionResult.session?.token, 'Registration+Login should return an active session token');
  assert.strictEqual(regResult.user.email, testEmail, 'Normalized email should match');
  assert.strictEqual((regResult.user as any).passwordHash, undefined, 'Sanitized user must NEVER contain passwordHash');
  console.log('    ✓ Register valid user & sanitize passwordHash');

  // 2. Register Duplicate Email
  await assert.rejects(
    () => authService.register(testEmail, 'Carlos Duplicate', testPassword),
    /already exists/,
    'Duplicate registration must be rejected'
  );
  console.log('    ✓ Duplicate email rejected');

  // TEST 1 — Auth válido
  const loginResult = await authService.login({ email: testEmail, password: testPassword });
  assert.ok(loginResult.session?.token, 'Login should succeed with correct credentials');
  assert.strictEqual((loginResult.user as any).passwordHash, undefined, 'Login output must NEVER contain passwordHash');
  console.log('    ✓ TEST 1 — Auth válido: Usuário correto + senha correta → login permitido');

  // TEST 2 — Auth inválido (senha incorreta e email inexistente)
  await assert.rejects(
    () => authService.login({ email: testEmail, password: 'WrongPassword999' }),
    /Invalid credentials/,
    'Invalid password must return generic error'
  );
  await assert.rejects(
    () => authService.login({ email: 'nonexistent_user_999@example.com', password: testPassword }),
    /Invalid credentials/,
    'Non-existent email must return generic error'
  );
  console.log('    ✓ TEST 2 — Auth inválido: Senha incorreta / email inexistente → login rejeitado');

  // TEST 3 — Auth sem credenciais (payload sem email, sem password ou com apenas userId)
  await assert.rejects(
    () => authService.login({ email: testEmail, password: '' }),
    /Invalid credentials/,
    'Missing password must be rejected'
  );
  const parseMissingPassword = LoginSchema.safeParse({ email: testEmail });
  assert.strictEqual(parseMissingPassword.success, false, 'LoginSchema must reject payload missing password');

  await assert.rejects(
    () => authService.login({ email: '', password: testPassword }),
    /Invalid credentials/,
    'Missing email must be rejected'
  );
  const parseMissingEmail = LoginSchema.safeParse({ password: testPassword });
  assert.strictEqual(parseMissingEmail.success, false, 'LoginSchema must reject payload missing email');

  await assert.rejects(
    () => authService.login({ userId: regResult.user.id } as any),
    /Invalid credentials/,
    'Authentication using userId alone must be strictly rejected'
  );
  const parseOnlyUserId = LoginSchema.safeParse({ userId: regResult.user.id });
  assert.strictEqual(parseOnlyUserId.success, false, 'LoginSchema must reject payload with only userId');

  await assert.rejects(
    () => authService.login({ userId: regResult.user.id, password: testPassword } as any),
    /Invalid credentials/,
    'Authentication using userId + password without email must be rejected'
  );
  const parseUserIdPassword = LoginSchema.safeParse({ userId: regResult.user.id, password: testPassword });
  assert.strictEqual(parseUserIdPassword.success, false, 'LoginSchema must reject payload with userId instead of email');

  console.log('    ✓ TEST 3 — Auth sem credenciais: Payload sem email/password ou apenas userId → rejeitado');

  // Session Valid
  const verifiedUser = await authService.verifySession(loginResult.session.token);
  assert.ok(verifiedUser, 'Valid session token must return authenticated user');
  assert.strictEqual(verifiedUser?.id, regResult.user.id, 'Verified user ID must match registered user');
  console.log('    ✓ Session token successfully verified via token hash');

  // Session Invalid / Expired
  const invalidUser = await authService.verifySession('invalid_token_xyz_999');
  assert.strictEqual(invalidUser, null, 'Invalid token must return null');
  console.log('    ✓ Invalid session rejected');

  // Logout / Revoke
  await authService.logout(loginResult.session.token);
  const revokedUser = await authService.verifySession(loginResult.session.token);
  assert.strictEqual(revokedUser, null, 'Revoked session must no longer authenticate');
  console.log('    ✓ Logout revokes session');

  // Tokens are random and only their hash is stored
  const s1 = await authService.login({ email: testEmail, password: testPassword });
  const s2 = await authService.login({ email: testEmail, password: testPassword });
  assert.notStrictEqual(s1.session.token, s2.session.token, 'Each login must get a distinct token');
  assert.ok(s1.session.token.length >= 40, 'Token must carry at least 256 bits of entropy');
  const stored = await db.select().from(sessions).where(eq(sessions.tokenHash, s1.session.token));
  assert.strictEqual(stored.length, 0, 'The raw token must never be stored');
  const hashed = await db.select().from(sessions).where(eq(sessions.tokenHash, hashSessionToken(s1.session.token)));
  assert.strictEqual(hashed.length, 1, 'The token hash must be stored');
  console.log('    ✓ Session token is random and stored only as SHA-256 hash');

  // Expired sessions are rejected (and removed)
  await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000).toISOString() }).where(eq(sessions.id, hashed[0].id));
  assert.strictEqual(await authService.verifySession(s1.session.token), null, 'Expired session must not authenticate');
  const afterExpiry = await db.select().from(sessions).where(eq(sessions.id, hashed[0].id));
  assert.strictEqual(afterExpiry.length, 0, 'Expired session must be deleted on lookup');
  assert.ok(await authService.verifySession(s2.session.token), 'Other sessions stay valid');
  console.log('    ✓ Expired session rejected');
}
