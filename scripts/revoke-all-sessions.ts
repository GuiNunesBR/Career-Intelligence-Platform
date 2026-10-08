import { isNull } from 'drizzle-orm';
import { db } from '../server/db/index.js';
import { sessions } from '../server/db/schema.js';

// Revokes every active session (e.g. after a token leak). Users must log in again.
async function revokeAllSessions() {
  const now = new Date().toISOString();
  const revoked = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(isNull(sessions.revokedAt))
    .returning({ id: sessions.id });

  console.log(`Revoked ${revoked.length} session(s).`);
  process.exit(0);
}

revokeAllSessions().catch((err) => {
  console.error(err);
  process.exit(1);
});
