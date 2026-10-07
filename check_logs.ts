import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:./sqlite.db' });

async function run() {
  const rs = await client.execute("SELECT * FROM background_jobs WHERE job_type = 'job_search_agent' ORDER BY createdAt DESC LIMIT 1");
  if (rs.rows.length > 0) {
    const job = rs.rows[0];
    console.log(JSON.stringify(job, null, 2));
  } else {
    console.log('No background jobs found.');
  }
}
run();
