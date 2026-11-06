import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';

// IMPORTANT: the repositories (and db/index.ts) read SQLITE_URL at import time
// to open their libsql connection. This test must therefore be run with
// SQLITE_URL pointing at a throwaway database, e.g.:
//
//   SQLITE_URL=file:./test-repos.db npx vitest run \
//     server/repositories/__tests__/sqlite.repositories.test.ts
//
// The vitest config in this repo sets a default so the suite also runs with a
// bare `vitest` invocation.
import { db, client } from '../../db/index.js';
import { users, experiences, sessions } from '../../db/schema.js';
import { SqliteUserRepository, hashSessionToken } from '../sqlite.user.repository.js';
import { SqliteCareerLakeRepository } from '../sqlite.lake.repository.js';
import { SqliteJobRepository } from '../sqlite.job.repository.js';
import { SqliteQueueRepository } from '../sqlite.queue.repository.js';
import { SqliteAnalysisRepository } from '../sqlite.analysis.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_FILE = path.join(
  __dirname,
  '..',
  '..',
  'db',
  'migrations',
  '0000_sqlite_init.sql'
);

const userRepo = new SqliteUserRepository();
const lakeRepo = new SqliteCareerLakeRepository();
const jobRepo = new SqliteJobRepository();
const queueRepo = new SqliteQueueRepository();
const analysisRepo = new SqliteAnalysisRepository();

function readMigrationStatements(): string[] {
  const raw = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  return raw
    .split('--> statement-breakpoint')
    // Drop leading comment-only lines within each block (e.g. the explanatory
    // header above a CREATE TRIGGER) so the real DDL is not discarded.
    .map((s: string) =>
      s
        .split('\n')
        .filter((line: string) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s: string) => s.length > 0);
}

beforeAll(async () => {
  // Enforce foreign keys on this connection, then (re)build the schema on the
  // throwaway database the repositories are pointed at via SQLITE_URL.
  await client.execute('PRAGMA foreign_keys = ON;');

  // Drop existing tables first so repeated local runs start from a clean
  // slate (dropping a table also removes its indexes and triggers). FK
  // enforcement is toggled off during teardown to avoid ordering issues.
  await client.execute('PRAGMA foreign_keys = OFF;');
  const existingTables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
  );
  for (const row of existingTables.rows) {
    await client.execute(`DROP TABLE IF EXISTS "${row.name as string}";`);
  }
  await client.execute('PRAGMA foreign_keys = ON;');

  for (const stmt of readMigrationStatements()) {
    await client.execute(stmt);
  }
});

afterAll(() => {
  client.close();
});

describe('SQLite Repositories - Isolation, Constraints & CRUD', () => {
  describe('1. Database Constraints & Foreign Keys', () => {
    it('should enforce composite FK: projects -> experiences (user_id, experience_id)', async () => {
      const user = await userRepo.createUser('test1@test.com', 'Test 1');
      const exp = await lakeRepo.addExperience(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test',
      });

      const proj = await lakeRepo.addProject(user.id, {
        name: 'Project A', description: 'Desc A', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: exp.id,
      });

      expect(proj.experienceId).toBe(exp.id);
    });

    it('should reject cross-tenant FK: linking to another user\'s experience should fail', async () => {
      const userA = await userRepo.createUser('usera@test.com', 'User A');
      const expA = await lakeRepo.addExperience(userA.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test',
      });

      const userB = await userRepo.createUser('userb@test.com', 'User B');

      await expect(lakeRepo.addProject(userB.id, {
        name: 'Project B', description: 'Desc B', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: expA.id,
      })).rejects.toThrow();
    });

    it('should set experience_id to null on experience deletion (SET NULL trigger)', async () => {
      const user = await userRepo.createUser('setnull@test.com', 'Set Null');
      const exp = await lakeRepo.addExperience(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test',
      });

      const proj = await lakeRepo.addProject(user.id, {
        name: 'Project A', description: 'Desc A', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: exp.id,
      });

      await db.delete(experiences).where(eq(experiences.id, exp.id));

      const updatedProj = await lakeRepo.getProjectById(user.id, proj.id);
      expect(updatedProj).not.toBeNull();
      expect(updatedProj?.experienceId).toBeUndefined(); // linking column nulled, row preserved
      expect(updatedProj?.userId).toBe(user.id);
    });

    it('should cascade delete user data when user is deleted', async () => {
      const user = await userRepo.createUser('cascade@test.com', 'Cascade');
      await lakeRepo.addExperience(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test',
      });

      await db.delete(users).where(eq(users.id, user.id));

      const exps = await db.select().from(experiences).where(eq(experiences.userId, user.id));
      expect(exps.length).toBe(0);
    });
  });

  describe('2. Tenant Isolation', () => {
    it('should not return another user\'s job in getJobById', async () => {
      const userA = await userRepo.createUser('iso1@test.com', 'Iso A');
      const jobA = await jobRepo.saveJob(userA.id, {
        id: 'jobA1', userId: userA.id, company: 'Comp', title: 'Title', location: 'Loc', seniority: 'Mid', employmentType: 'FT', description: 'Desc', requirements: [], rawText: 'Raw', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });

      const userB = await userRepo.createUser('iso2@test.com', 'Iso B');

      const fetched = await jobRepo.getJobById(userB.id, jobA.id);
      expect(fetched).toBeNull();
    });

    it('should only return the authenticated user\'s career lake', async () => {
      const userA = await userRepo.createUser('iso3@test.com', 'Iso 3');
      await lakeRepo.addExperience(userA.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test',
      });

      const userB = await userRepo.createUser('iso4@test.com', 'Iso 4');
      const lakeB = await lakeRepo.getUserLake(userB.id);

      expect(lakeB.experiences.length).toBe(0);
    });
  });

  describe('3. Repository CRUD Operations', () => {
    it('should correctly save and retrieve a Fit Analysis', async () => {
      const user = await userRepo.createUser('crud1@test.com', 'CRUD 1');
      await jobRepo.saveJob(user.id, {
        id: 'job1', userId: user.id, company: 'C', title: 'T', location: 'L', seniority: 'S', employmentType: 'FT', description: 'Desc', requirements: [], rawText: 'Raw', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      await analysisRepo.saveAnalysis(user.id, {
        id: 'analysis1', userId: user.id, jobId: 'job1', overallSummary: 'Summary',
        dimensions: {
          functionalFit: 0, domainFit: 0, technicalFit: 0, seniorityScopeFit: 0, leadershipFit: 0, stakeholderFit: 0, languageFit: 0, evidenceStrength: 0, transferability: 0,
        },
        evidenceMatrix: [], strongMatches: [], transferableExperiences: [], domainGaps: [], missingEvidence: [], recommendedCvFocus: [], createdAt: new Date().toISOString(),
      });

      const fetched = await analysisRepo.getAnalysisForJob(user.id, 'job1');
      expect(fetched?.overallSummary).toBe('Summary');
    });

    it('should correctly handle idempotent insertions in Background Jobs (JobQueue)', async () => {
      const userA = await userRepo.createUser('idem1@test.com', 'Idem 1');

      await queueRepo.saveBackgroundJob(userA.id, {
        id: 'bj1', userId: userA.id, jobType: 'scheduled_tailor', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });

      // Same idempotency key for the same user must be rejected by the
      // partial unique index.
      await expect(queueRepo.saveBackgroundJob(userA.id, {
        id: 'bj2', userId: userA.id, jobType: 'scheduled_tailor', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      })).rejects.toThrow();

      // A different user may reuse the same idempotency key.
      const userB = await userRepo.createUser('idem2@test.com', 'Idem 2');
      await queueRepo.saveBackgroundJob(userB.id, {
        id: 'bj3', userId: userB.id, jobType: 'scheduled_tailor', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    });
  });

  describe('4. Auth Security', () => {
    it('should enforce token hash uniqueness across all sessions', async () => {
      const userA = await userRepo.createUser('auth1@test.com', 'Auth 1');
      const sess1 = await userRepo.createSession(userA.id);

      // Only the token hash is stored; inserting another session with the same hash must fail.
      await expect(db.insert(sessions).values({
        id: 'sess2', userId: userA.id, tokenHash: hashSessionToken(sess1.token), createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(),
      })).rejects.toThrow();
    });

    it('should correctly ignore revoked sessions', async () => {
      const userA = await userRepo.createUser('auth2@test.com', 'Auth 2');
      const sess = await userRepo.createSession(userA.id);

      await db.update(sessions).set({ revokedAt: new Date().toISOString() }).where(eq(sessions.tokenHash, hashSessionToken(sess.token)));

      const fetched = await userRepo.getSession(sess.token);
      expect(fetched).toBeNull();
    });
  });
});
