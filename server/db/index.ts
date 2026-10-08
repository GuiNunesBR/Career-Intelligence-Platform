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

// Export the drizzle database instance
export const db = drizzle(client, { schema });
