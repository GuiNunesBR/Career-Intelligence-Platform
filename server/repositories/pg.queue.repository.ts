import { eq, and, or } from 'drizzle-orm';
import { IJobQueueRepository } from './interfaces.js';
import { BackgroundJob, BackgroundJobType } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { backgroundJobs } from '../db/schema.js';

export class PgQueueRepository implements IJobQueueRepository {
  async getBackgroundJobs(userId: string): Promise<BackgroundJob[]> {
    const result = await db.select().from(backgroundJobs).where(eq(backgroundJobs.userId, userId));
    return result.map(j => ({
      ...j,
      jobType: j.jobType as BackgroundJobType,
      automationId: j.automationId || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      scheduledAt: j.scheduledAt.toISOString(),
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt?.toISOString(),
      finishedAt: j.finishedAt?.toISOString(),
      result: j.result || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }));
  }

  async getJobById(userId: string, id: string): Promise<BackgroundJob | null> {
    const result = await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.userId, userId), eq(backgroundJobs.id, id))).limit(1);
    if (result.length === 0) return null;
    const j = result[0];
    return {
      ...j,
      jobType: j.jobType as BackgroundJobType,
      automationId: j.automationId || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      scheduledAt: j.scheduledAt.toISOString(),
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt?.toISOString(),
      finishedAt: j.finishedAt?.toISOString(),
      result: j.result || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    };
  }

  async getAllPendingJobs(): Promise<BackgroundJob[]> {
    const result = await db.select().from(backgroundJobs).where(
      or(
        eq(backgroundJobs.status, 'pending'),
        eq(backgroundJobs.status, 'running') // the queue service actually claims running jobs too if it restarts
      )
    );
    return result.map(j => ({
      ...j,
      jobType: j.jobType as BackgroundJobType,
      automationId: j.automationId || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      scheduledAt: j.scheduledAt.toISOString(),
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt?.toISOString(),
      finishedAt: j.finishedAt?.toISOString(),
      result: j.result || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }));
  }

  async saveBackgroundJob(userId: string, job: BackgroundJob): Promise<BackgroundJob> {
    const existing = await this.getJobById(userId, job.id);
    if (existing) {
      const [updated] = await db.update(backgroundJobs).set({
        status: job.status,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        progress: job.progress,
        result: job.result,
        error: job.error,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        retryCount: job.retryCount,
        logs: job.logs,
        updatedAt: new Date(),
      }).where(and(eq(backgroundJobs.userId, userId), eq(backgroundJobs.id, job.id))).returning();
      
      return {
        ...updated,
        jobType: updated.jobType as BackgroundJobType,
        automationId: updated.automationId || undefined,
        idempotencyKey: updated.idempotencyKey || undefined,
        scheduledAt: updated.scheduledAt.toISOString(),
        status: updated.status as BackgroundJob['status'],
        startedAt: updated.startedAt?.toISOString(),
        finishedAt: updated.finishedAt?.toISOString(),
        result: updated.result || undefined,
        error: updated.error || undefined,
        logs: updated.logs as string[],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } else {
      const [inserted] = await db.insert(backgroundJobs).values({
        id: job.id,
        userId,
        jobType: job.jobType,
        automationId: job.automationId,
        idempotencyKey: job.idempotencyKey,
        scheduledAt: new Date(job.scheduledAt),
        status: job.status,
        startedAt: job.startedAt ? new Date(job.startedAt) : null,
        finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        progress: job.progress,
        result: job.result,
        error: job.error,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        retryCount: job.retryCount,
        logs: job.logs,
      }).returning();
      
      return {
        ...inserted,
        jobType: inserted.jobType as BackgroundJobType,
        automationId: inserted.automationId || undefined,
        idempotencyKey: inserted.idempotencyKey || undefined,
        scheduledAt: inserted.scheduledAt.toISOString(),
        status: inserted.status as BackgroundJob['status'],
        startedAt: inserted.startedAt?.toISOString(),
        finishedAt: inserted.finishedAt?.toISOString(),
        result: inserted.result || undefined,
        error: inserted.error || undefined,
        logs: inserted.logs as string[],
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    }
  }

  async cancelJob(userId: string, id: string): Promise<BackgroundJob | null> {
    const existing = await this.getJobById(userId, id);
    if (!existing || existing.status === 'completed' || existing.status === 'failed' || existing.status === 'cancelled') {
      return null;
    }
    
    existing.status = 'cancelled';
    existing.finishedAt = new Date().toISOString();
    existing.logs.push(`[${new Date().toISOString()}] Job cancelled by user`);
    return this.saveBackgroundJob(userId, existing);
  }
}
