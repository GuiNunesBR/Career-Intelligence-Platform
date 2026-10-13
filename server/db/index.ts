import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import { SQLITE_SCHEMA } from './sqlite-schema.js';

// SQLITE_FILE lets tests (and scripts) use their own database file
const DEFAULT_DB_FILE = './sqlite.db';
const dbFile = process.env.SQLITE_FILE || DEFAULT_DB_FILE;
if (process.env.NODE_ENV === 'test' && dbFile === DEFAULT_DB_FILE) {
  // Test suites wipe tables: never let them touch the app's database
  throw new Error('Tests must set SQLITE_FILE to a throwaway database (refusing to open ./sqlite.db).');
}
const client = createClient({ url: `file:${dbFile}` });

// sqlite.db is not versioned: create tables on boot if they don't exist yet
await client.executeMultiple(SQLITE_SCHEMA);

// Columns added after the initial schema. Applied idempotently to new and existing databases.
const ADDED_COLUMNS: Array<[table: string, column: string, type: string]> = [
  ['career_profiles', 'contact', 'text'],
  ['career_profiles', 'certifications', 'text'],
  ['experiences', 'origin', 'text'],
  ['projects', 'origin', 'text'],
  ['skills', 'origin', 'text'],
  ['evidences', 'tools', 'text'],
  ['tailored_cvs', 'language', 'text'],
  ['tailored_cvs', 'job_keywords', 'text'],
  ['tailored_cvs', 'grounding_issues', 'text'],
  ['jobs', 'search_meta', 'text'],
  ['search_agents', 'prompt', 'text'],
  ['search_agents', 'plan', 'text'],
];
for (const [table, column, type] of ADDED_COLUMNS) {
  const info = await client.execute(`PRAGMA table_info(\`${table}\`)`);
  if (!info.rows.some((row) => row.name === column)) {
    await client.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`);
  }
}

// Export the drizzle database instance
export const db = drizzle(client, { schema });
