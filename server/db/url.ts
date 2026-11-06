export const DEFAULT_SQLITE_URL = 'file:./sqlite.db';

/**
 * Resolves the libsql URL of the application database.
 *
 * SQLITE_URL takes any libsql URL (file:, libsql://). SQLITE_FILE takes a plain
 * file path. We deliberately do NOT read DATABASE_URL because that variable
 * carries a PostgreSQL connection string in some deploy configs and must not be
 * handed to the libsql client.
 */
export function resolveSqliteUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SQLITE_URL) return env.SQLITE_URL;
  if (env.SQLITE_FILE) return `file:${env.SQLITE_FILE}`;
  return DEFAULT_SQLITE_URL;
}
