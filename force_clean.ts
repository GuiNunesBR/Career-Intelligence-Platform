import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';

async function hardClean() {
  console.log('Forçando limpeza nas tabelas problemáticas...');
  await db.run(sql`DELETE FROM experiences`);
  await db.run(sql`DELETE FROM career_profiles`);
  await db.run(sql`DELETE FROM skills`);
  await db.run(sql`DELETE FROM jobs`);
  await db.run(sql`DELETE FROM fit_analyses`);
  await db.run(sql`DELETE FROM search_agents`);
  console.log('Experiences DELETADAS com SUCESSO via raw sql.');
  process.exit(0);
}
hardClean();
