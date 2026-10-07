import { db } from './server/db/index.js';
import { jobs } from './server/db/schema.js';
import { like } from 'drizzle-orm';

async function fix() {
  const mockNames = ['%TechNova%', '%DataCorp%', '%Innovate INC%'];
  for (const n of mockNames) {
    await db.delete(jobs).where(like(jobs.company, n));
  }
  console.log('Mocks deleted!');
  process.exit(0);
}
fix();
