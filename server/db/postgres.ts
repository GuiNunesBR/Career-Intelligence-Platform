import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

// Default to a fallback for tests if environment variables are missing
const pool = new Pool({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_USER || 'ai_studio_app_user',
  password: process.env.SQL_PASSWORD || 'password',
  database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
  port: parseInt(process.env.SQL_PORT || '5432', 10),
});

export const db = drizzle(pool, { schema });
export type PostgresDB = typeof db;
