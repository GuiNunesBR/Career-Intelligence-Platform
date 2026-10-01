import fs from 'fs';
import path from 'path';
import { db } from '../server/db/index.js';
import { users } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

async function migrateUsers() {
  if (fs.existsSync(USERS_FILE)) {
    console.log('Found users.json, updating users...');
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

    for (const u of usersData) {
      // Upsert or Update the user
      await db.update(users)
        .set({
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          avatar: u.avatar || null,
          currentRole: u.currentRole,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt
        })
        .where(eq(users.id, u.id));
        
      // For any user that wasn't updated because they didn't exist in the stub (just in case)
      const existing = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
      if (existing.length === 0) {
          await db.insert(users).values({
              id: u.id,
              email: u.email,
              passwordHash: u.passwordHash,
              name: u.name,
              avatar: u.avatar || null,
              currentRole: u.currentRole,
              createdAt: u.createdAt,
              updatedAt: u.updatedAt
          });
      }
    }
    console.log('Successfully migrated user data from users.json.');
  }
  process.exit(0);
}

migrateUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
