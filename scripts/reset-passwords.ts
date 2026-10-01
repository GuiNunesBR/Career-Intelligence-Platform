import { db } from '../server/db/index.js';
import { users } from '../server/db/schema.js';
import bcrypt from 'bcryptjs';

async function resetPasswords() {
  const hash = bcrypt.hashSync('CareerLake@2026', 10);
  
  await db.update(users).set({ passwordHash: hash });
  
  console.log('All users passwords reset to CareerLake@2026');
  process.exit(0);
}

resetPasswords().catch(err => {
  console.error(err);
  process.exit(1);
});
