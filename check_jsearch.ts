import Database from 'better-sqlite3';

const db = new Database('./server/db/database.sqlite');
const rows = db.prepare(`SELECT id, job_type, status, error, created_at, scheduled_at FROM background_jobs WHERE job_type = 'job_search_agent' ORDER BY created_at DESC LIMIT 5`).all();

console.log('--- JOB_SEARCH_AGENT Jobs ---');
for (const j of rows) {
  console.log(`[${j.created_at}] ${j.status} - scheduled: ${j.scheduled_at} - error: ${j.error}`);
}
