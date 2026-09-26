import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

// Load environment variables if needed
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const sqlFile = path.join(migrationsDir, '0000_phase2_init.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`Migration file not found: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("Applying raw SQL migration...");
  try {
    await pool.query(sql);
    console.log("✅ Migration completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:");
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
