import { eq, and } from 'drizzle-orm';
import { IJobRepository } from './interfaces.js';
import { Job } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { jobs } from '../db/schema.js';

export class SqliteJobRepository implements IJobRepository {
  async getJobs(userId: string): Promise<Job[]> {
    const result = await db.select().from(jobs).where(eq(jobs.userId, userId));
    return result.map(j => ({
      ...j,
      requirements: j.requirements as any, // Will fix JSONB mapping in next step
      url: j.url || undefined,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));
  }

  async getJobById(userId: string, jobId: string): Promise<Job | null> {
    const result = await db.select().from(jobs).where(and(eq(jobs.userId, userId), eq(jobs.id, jobId))).limit(1);
    if (result.length === 0) return null;
    const j = result[0];
    return {
      ...j,
      url: j.url || undefined,
      requirements: j.requirements as any,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    };
  }

  async saveJob(userId: string, job: Job): Promise<Job> {
    const existing = await this.getJobById(userId, job.id);
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
        url: job.url,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(jobs.userId, userId), eq(jobs.id, job.id))).returning();
      
      return {
        ...updated,
        url: updated.url || undefined,
        requirements: updated.requirements as any,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
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
        url: job.url,
      }).returning();
      
      return {
        ...inserted,
        url: inserted.url || undefined,
        requirements: inserted.requirements as any,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      };
    }
  }

  async deleteJob(userId: string, jobId: string): Promise<boolean> {
    const result = await db.delete(jobs).where(and(eq(jobs.userId, userId), eq(jobs.id, jobId))).returning({ id: jobs.id });
    return result.length > 0;
  }
}
