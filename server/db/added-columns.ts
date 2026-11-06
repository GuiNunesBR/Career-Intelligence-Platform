import type { Client } from '@libsql/client';

// Columns added after the initial schema. They are part of
// migrations/0000_sqlite_init.sql and sqlite-schema.ts for fresh databases, and
// applied idempotently here to databases created before they existed.
export const ADDED_COLUMNS: Array<[table: string, column: string, type: string]> = [
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

export async function applyAddedColumns(client: Client): Promise<void> {
  for (const [table, column, type] of ADDED_COLUMNS) {
    const info = await client.execute(`PRAGMA table_info(\`${table}\`)`);
    if (!info.rows.some((row) => row.name === column)) {
      await client.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`);
    }
  }
}
