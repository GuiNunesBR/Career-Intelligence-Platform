import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

// Load environment variables if needed
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Applies the SQLite schema migration to the libsql database.
 *
 * The application runs on SQLite (see server/db/index.ts). The database URL
 * defaults to the same local file the app uses and can be overridden with
 * SQLITE_URL (e.g. a libsql:// URL or a file: path) for CI / other envs.
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const sqlFile = path.join(migrationsDir, '0000_sqlite_init.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error(`Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(sqlFile, 'utf-8');

  // The migration uses Drizzle-style "--> statement-breakpoint" separators.
  // Split on them and execute each statement individually.
  const statements = raw
    .split('--> statement-breakpoint')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  const url = process.env.SQLITE_URL || 'file:./sqlite.db';
  const client = createClient({ url });

  console.log(`Applying SQLite migration to ${url} ...`);
  try {
    // Ensure foreign key enforcement is active for this connection.
    await client.execute('PRAGMA foreign_keys = ON;');
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log('✅ Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigrations();
