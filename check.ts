import { db } from './server/db.js';

async function run() {
  const result = await db.$client.execute("SELECT id, status, job_type, created_at, scheduled_at FROM background_jobs WHERE job_type = 'job_search_agent' ORDER BY created_at DESC");
  console.log(result.rows);
  process.exit(0);
}
run();
