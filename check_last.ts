import Database from 'better-sqlite3';
const db = new Database('./server/db/database.sqlite');
const lastJob = db.prepare("SELECT * FROM background_jobs WHERE job_type = 'job_search_agent' ORDER BY created_at DESC LIMIT 1").get() as any;
if (lastJob) {
  lastJob.logs = JSON.parse(lastJob.logs);
  lastJob.payload = JSON.parse(lastJob.payload);
  lastJob.result = JSON.parse(lastJob.result);
}
console.log(JSON.stringify(lastJob, null, 2));
