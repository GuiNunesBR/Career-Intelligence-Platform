import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import { SQLITE_SCHEMA } from './sqlite-schema.js';

// Setup SQLite connection using libsql
const client = createClient({
  url: 'file:./sqlite.db',
});

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
];
for (const [table, column, type] of ADDED_COLUMNS) {
  const info = await client.execute(`PRAGMA table_info(\`${table}\`)`);
  if (!info.rows.some((row) => row.name === column)) {
    await client.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`);
  }
}

// Export the drizzle database instance
export const db = drizzle(client, { schema });
