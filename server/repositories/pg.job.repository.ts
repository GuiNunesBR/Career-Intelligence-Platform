import { eq, and } from 'drizzle-orm';
import { IJobRepository } from './interfaces.js';
import { Job } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { jobs } from '../db/schema.js';

export class PgJobRepository implements IJobRepository {
  getJobs(userId: string): Job[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getJobsAsync(userId: string): Promise<Job[]> {
    const result = await db.select().from(jobs).where(eq(jobs.userId, userId));
    return result.map(j => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }));
  }

  getJobById(userId: string, jobId: string): Job | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getJobByIdAsync(userId: string, jobId: string): Promise<Job | null> {
    const result = await db.select().from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.id, jobId))).limit(1);
    if (result.length === 0) return null;
    const j = result[0];
    return {
      ...j,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    };
  }

  saveJob(userId: string, job: Job): Job {
    throw new Error('Not implemented: requires async adaptation');
  }

  async saveJobAsync(userId: string, job: Job): Promise<Job> {
    const existing = await this.getJobByIdAsync(userId, job.id);
    if (existing) {
      const [updated] = await db.update(jobs).set({
        company: job.company,
        title: job.title,
        location: job.location,
        seniority: job.seniority,
        employmentType: job.employmentType,
        description: job.description,
        requirements: job.requirements,
        rawText: job.rawText,
        updatedAt: new Date(),
      }).where(and(eq(jobs.userId, userId), eq(jobs.id, job.id))).returning();
      
      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } else {
      const [inserted] = await db.insert(jobs).values({
        id: job.id,
        userId,
        company: job.company,
        title: job.title,
        location: job.location,
        seniority: job.seniority,
        employmentType: job.employmentType,
        description: job.description,
        requirements: job.requirements,
        rawText: job.rawText,
      }).returning();
      
      return {
        ...inserted,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    }
  }

  deleteJob(userId: string, jobId: string): boolean {
    throw new Error('Not implemented: requires async adaptation');
  }

  async deleteJobAsync(userId: string, jobId: string): Promise<boolean> {
    const result = await db.delete(jobs).where(and(eq(jobs.userId, userId), eq(jobs.id, jobId))).returning({ id: jobs.id });
    return result.length > 0;
  }
}
