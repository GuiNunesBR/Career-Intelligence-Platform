import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import { SQLITE_SCHEMA } from './sqlite-schema.js';
import { resolveSqliteUrl, DEFAULT_SQLITE_URL } from './url.js';
import { applyAddedColumns } from './added-columns.js';

// SQLITE_URL (any libsql URL, e.g. file:/var/data/sqlite.db on a persistent
// disk) or SQLITE_FILE (a plain path) let deploys, tests and scripts use their
// own database. See ./url.ts.
const dbUrl = resolveSqliteUrl();
if (process.env.NODE_ENV === 'test' && dbUrl === DEFAULT_SQLITE_URL) {
  // Test suites wipe tables: never let them touch the app's database
  throw new Error('Tests must set SQLITE_FILE or SQLITE_URL to a throwaway database (refusing to open ./sqlite.db).');
}
const client = createClient({ url: dbUrl });

// sqlite.db is not versioned: create tables on boot if they don't exist yet.
// `npm run db:migrate` applies the same base schema plus the SET NULL triggers.
await client.executeMultiple(SQLITE_SCHEMA);

// Columns added after the initial schema, applied idempotently to existing databases.
await applyAddedColumns(client);

// SQLite only enforces foreign key constraints when this pragma is enabled on
// the connection. Fire-and-forget on startup; libsql queues it ahead of any
// subsequent statements on this single-connection client.
void client.execute('PRAGMA foreign_keys = ON;');

// Export the drizzle database instance
export const db = drizzle(client, { schema });
export { client };
