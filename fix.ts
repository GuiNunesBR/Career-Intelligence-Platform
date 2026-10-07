import { db } from './server/db/index.js';
import { backgroundJobs } from './server/db/schema.js';

async function fix() {
  await db.update(backgroundJobs).set({ status: 'failed' });
  console.log('Cleared all stuck background jobs.');
  process.exit(0);
}
fix();
