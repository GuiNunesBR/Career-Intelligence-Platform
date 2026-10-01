import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

// Setup SQLite connection using libsql
const client = createClient({
  url: 'file:./sqlite.db',
});

// Export the drizzle database instance
export const db = drizzle(client, { schema });
