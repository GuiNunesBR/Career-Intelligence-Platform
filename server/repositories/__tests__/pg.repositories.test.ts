// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db/postgres.js';
import { users, experiences, projects, sessions } from '../../db/schema.js';
import { PgUserRepository } from '../pg.user.repository.js';
import { PgCareerLakeRepository } from '../pg.lake.repository.js';
import { PgJobRepository } from '../pg.job.repository.js';
import { PgQueueRepository } from '../pg.queue.repository.js';
import { PgAnalysisRepository } from '../pg.analysis.repository.js';
import { eq } from 'drizzle-orm';

describe('V3.1 Phase 3 - PostgreSQL & Repositories Verification', () => {
  const userRepo = new PgUserRepository();
  const lakeRepo = new PgCareerLakeRepository();
  const jobRepo = new PgJobRepository();
  const queueRepo = new PgQueueRepository();
  const analysisRepo = new PgAnalysisRepository();

  describe('1. Database Constraints & Foreign Keys', () => {
    it('should enforce composite FK: projects -> experiences (user_id, experience_id)', async () => {
      const user = await userRepo.createUser('test1@test.com', 'Test 1');
      const exp = await lakeRepo.addExperienceAsync(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test'
      });
      
      const proj = await lakeRepo.addProjectAsync(user.id, {
        name: 'Project A', description: 'Desc A', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: exp.id
      });
      
      expect(proj.experienceId).toBe(exp.id);
    });

    it('should reject cross-tenant FK: linking to another user\'s experience should fail', async () => {
      const userA = await userRepo.createUser('usera@test.com', 'User A');
      const expA = await lakeRepo.addExperienceAsync(userA.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test'
      });

      const userB = await userRepo.createUser('userb@test.com', 'User B');
      
      await expect(lakeRepo.addProjectAsync(userB.id, {
        name: 'Project B', description: 'Desc B', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: expA.id
      })).rejects.toThrow();
    });

    it('should apply SET NULL specific on experience deletion', async () => {
      const user = await userRepo.createUser('setnull@test.com', 'Set Null');
      const exp = await lakeRepo.addExperienceAsync(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test'
      });
      
      const proj = await lakeRepo.addProjectAsync(user.id, {
        name: 'Project A', description: 'Desc A', domain: 'IT', scope: 'Global', technologies: ['TS'], experienceId: exp.id
      });
      
      await db.delete(experiences).where(eq(experiences.id, exp.id));
      
      const updatedProj = await lakeRepo.getProjectByIdAsync(user.id, proj.id);
      expect(updatedProj).toBeDefined();
      expect(updatedProj?.experienceId).toBeUndefined(); // Was set to null and stripped
      expect(updatedProj?.userId).toBe(user.id);
    });

    it('should cascade delete user data when user is deleted', async () => {
      const user = await userRepo.createUser('cascade@test.com', 'Cascade');
      await lakeRepo.addExperienceAsync(user.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test'
      });
      
      await db.delete(users).where(eq(users.id, user.id));
      
      const exps = await db.select().from(experiences).where(eq(experiences.userId, user.id));
      expect(exps.length).toBe(0);
    });
  });

  describe('2. Tenant Isolation', () => {
    it('should not return another user\'s job in getJobById', async () => {
      const userA = await userRepo.createUser('iso1@test.com', 'Iso A');
      const jobA = await jobRepo.saveJobAsync(userA.id, {
        id: 'jobA1', company: 'Comp', title: 'Title', location: 'Loc', seniority: 'Mid', employmentType: 'FT', description: 'Desc', requirements: [], rawText: 'Raw'
      });

      const userB = await userRepo.createUser('iso2@test.com', 'Iso B');
      
      const fetched = await jobRepo.getJobByIdAsync(userB.id, jobA.id);
      expect(fetched).toBeNull();
    });

    it('should only return the authenticated user\'s career lake', async () => {
      const userA = await userRepo.createUser('iso3@test.com', 'Iso 3');
      await lakeRepo.addExperienceAsync(userA.id, {
        company: 'Company A', title: 'Title A', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Remote', description: 'Test'
      });

      const userB = await userRepo.createUser('iso4@test.com', 'Iso 4');
      const lakeB = await lakeRepo.getUserLakeAsync(userB.id);
      
      expect(lakeB.experiences.length).toBe(0);
    });
  });

  describe('3. Repository CRUD Operations', () => {
    it('should correctly save and retrieve a Fit Analysis', async () => {
      const user = await userRepo.createUser('crud1@test.com', 'CRUD 1');
      const analysis = await analysisRepo.saveAnalysisAsync(user.id, {
        id: 'analysis1', jobId: 'job1', overallSummary: 'Summary', dimensions: [], evidenceMatrix: [], strongMatches: [], transferableExperiences: [], domainGaps: [], missingEvidence: [], recommendedCvFocus: []
      });
      
      const fetched = await analysisRepo.getAnalysisForJobAsync(user.id, 'job1');
      expect(fetched?.overallSummary).toBe('Summary');
    });

    it('should correctly handle idempotent insertions in Background Jobs (JobQueue)', async () => {
      const userA = await userRepo.createUser('idem1@test.com', 'Idem 1');
      
      await queueRepo.saveBackgroundJobAsync(userA.id, {
        id: 'bj1', jobType: 'tailor_cv', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: []
      });

      // Should fail/do nothing if we try to insert another job with same idempotency key for same user.
      // Drizzle handles this based on schema constraints (either throws or ignored depending on implementation).
      await expect(queueRepo.saveBackgroundJobAsync(userA.id, {
        id: 'bj2', jobType: 'tailor_cv', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: []
      })).rejects.toThrow();

      // Different user should succeed
      const userB = await userRepo.createUser('idem2@test.com', 'Idem 2');
      await queueRepo.saveBackgroundJobAsync(userB.id, {
        id: 'bj3', jobType: 'tailor_cv', idempotencyKey: 'idem_key_1', scheduledAt: new Date().toISOString(), status: 'pending', progress: 0, attempt: 0, maxAttempts: 3, retryCount: 0, logs: []
      });
    });
  });

  describe('4. Auth Security', () => {
    it('should enforce token hash uniqueness across all sessions', async () => {
      const userA = await userRepo.createUser('auth1@test.com', 'Auth 1');
      const sess1 = await userRepo.createSession(userA.id);
      
      // Attempting to insert another session with the same token hash MUST FAIL
      await expect(db.insert(sessions).values({
        id: 'sess2', userId: userA.id, tokenHash: sess1.token, createdAt: new Date(), expiresAt: new Date()
      })).rejects.toThrow();
    });

    it('should correctly ignore revoked or expired sessions', async () => {
      const userA = await userRepo.createUser('auth2@test.com', 'Auth 2');
      const sess = await userRepo.createSession(userA.id);
      
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, sess.token));
      
      const fetched = await userRepo.getSession(sess.token);
      expect(fetched).toBeNull();
    });
  });

  describe('5. Transactions', () => {
    it('should rollback all operations if a sub-operation fails inside a transaction', async () => {
      const userId = 'tx_user_1';
      
      try {
        await db.transaction(async (tx) => {
          await tx.insert(users).values({
            id: userId, email: 'tx@test.com', name: 'TX', passwordHash: '', currentRole: 'User'
          });
          
          // Malformed insert (missing required fields) -> throws
          await tx.insert(experiences).values({
            id: 'exp_tx_1', userId: userId, company: 'Company', title: 'Title', startDate: '2020', // Missing 'employmentType' 'domain' 'location' 'description'
          } as any);
        });
      } catch (err) {
        // Ignored
      }
      
      const user = await db.select().from(users).where(eq(users.id, userId));
      expect(user.length).toBe(0);
    });
  });
});
