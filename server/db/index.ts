import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

// Setup SQLite connection using libsql. SQLITE_URL lets tests (and other
// environments) point at an isolated SQLite/libsql database; it defaults to
// the local file the application uses. We deliberately do NOT read
// DATABASE_URL here because that variable carries a PostgreSQL connection
// string in some deploy configs and must not be handed to the libsql client.
const client = createClient({
  url: process.env.SQLITE_URL || 'file:./sqlite.db',
});

// SQLite only enforces foreign key constraints when this pragma is enabled on
// the connection. Fire-and-forget on startup; libsql queues it ahead of any
// subsequent statements on this single-connection client.
void client.execute('PRAGMA foreign_keys = ON;');

// Export the drizzle database instance
export const db = drizzle(client, { schema });
export { client };
