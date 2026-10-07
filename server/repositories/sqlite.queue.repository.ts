import { eq, and, or } from 'drizzle-orm';
import { IJobQueueRepository } from './interfaces.js';
import { BackgroundJob, BackgroundJobType } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { backgroundJobs } from '../db/schema.js';

export class SqliteQueueRepository implements IJobQueueRepository {
  async getBackgroundJobs(userId: string): Promise<BackgroundJob[]> {
    const result = await db.select().from(backgroundJobs).where(eq(backgroundJobs.userId, userId));
    return result.map(j => ({
      ...j,
      jobType: j.jobType as BackgroundJobType,
      automationId: j.automationId || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      scheduledAt: j.scheduledAt,
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt || undefined,
      finishedAt: j.finishedAt || undefined,
      result: j.result || undefined,
      payload: j.payload || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
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
      scheduledAt: j.scheduledAt,
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt || undefined,
      finishedAt: j.finishedAt || undefined,
      result: j.result || undefined,
      payload: j.payload || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    };
  }

  async getAllPendingJobs(): Promise<BackgroundJob[]> {
    const result = await db.select().from(backgroundJobs).where(
      or(
        eq(backgroundJobs.status, 'pending'),
        eq(backgroundJobs.status, 'queued'),
        eq(backgroundJobs.status, 'running') // the queue service actually claims running jobs too if it restarts
      )
    );
    return result.map(j => ({
      ...j,
      jobType: j.jobType as BackgroundJobType,
      automationId: j.automationId || undefined,
      idempotencyKey: j.idempotencyKey || undefined,
      scheduledAt: j.scheduledAt,
      status: j.status as BackgroundJob['status'],
      startedAt: j.startedAt || undefined,
      finishedAt: j.finishedAt || undefined,
      result: j.result || undefined,
      payload: j.payload || undefined,
      error: j.error || undefined,
      logs: j.logs as string[],
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));
  }

  async saveBackgroundJob(userId: string, job: BackgroundJob): Promise<BackgroundJob> {
    const existing = await this.getJobById(userId, job.id);
    if (existing) {
      let updated;
      try {
        [updated] = await db.update(backgroundJobs).set({
          status: job.status,
          startedAt: job.startedAt || null,
          finishedAt: job.finishedAt || null,
          progress: job.progress,
          result: job.result,
          payload: job.payload,
          error: job.error,
          attempt: job.attempt,
          maxAttempts: job.maxAttempts,
          retryCount: job.retryCount,
          logs: job.logs,
          updatedAt: new Date().toISOString(),
        }).where(and(eq(backgroundJobs.userId, userId), eq(backgroundJobs.id, job.id))).returning();
      } catch (err: any) {
        console.error('Detailed saveBackgroundJob error:', err.message, err.cause);
        throw err;
      }
      
      if (!updated) {
        throw new Error(`Concurrency error: Background job ${job.id} was deleted or unavailable during update.`);
      }

      return {
        ...updated,
        jobType: updated.jobType as BackgroundJobType,
        automationId: updated.automationId || undefined,
        idempotencyKey: updated.idempotencyKey || undefined,
        scheduledAt: updated.scheduledAt,
        status: updated.status as BackgroundJob['status'],
        startedAt: updated.startedAt || undefined,
        finishedAt: updated.finishedAt || undefined,
        result: updated.result || undefined,
        payload: updated.payload || undefined,
        error: updated.error || undefined,
        logs: updated.logs as string[],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      const [inserted] = await db.insert(backgroundJobs).values({
        id: job.id,
        userId,
        jobType: job.jobType,
        automationId: job.automationId,
        idempotencyKey: job.idempotencyKey,
        scheduledAt: job.scheduledAt,
        status: job.status,
        startedAt: job.startedAt || null,
        finishedAt: job.finishedAt || null,
        progress: job.progress,
        result: job.result,
        payload: job.payload,
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
        scheduledAt: inserted.scheduledAt,
        status: inserted.status as BackgroundJob['status'],
        startedAt: inserted.startedAt || undefined,
        finishedAt: inserted.finishedAt || undefined,
        result: inserted.result || undefined,
        payload: inserted.payload || undefined,
        error: inserted.error || undefined,
        logs: inserted.logs as string[],
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
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
