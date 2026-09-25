import { IJobQueueRepository } from '../repositories/interfaces.js';
import { BackgroundJob, BackgroundJobType } from '../../src/shared/types.js';

export class QueueService {
  constructor(private queueRepo: IJobQueueRepository) {}

  async getJobs(userId: string): Promise<BackgroundJob[]> {
    if (!userId) throw new Error('User ID is required');
    return this.queueRepo.getBackgroundJobs(userId);
  }

  async getJobById(userId: string, id: string): Promise<BackgroundJob | null> {
    if (!userId) throw new Error('User ID is required');
    return this.queueRepo.getJobById(userId, id);
  }

  async enqueueJob(
    userId: string,
    jobType: BackgroundJobType,
    payload?: any,
    scheduledAt?: string,
    customIdempotencyKey?: string
  ): Promise<BackgroundJob> {
    if (!userId) throw new Error('User ID is required');

    // Deterministic Idempotency Key
    const executionWindow = new Date().toISOString().slice(0, 13);
    const idempotencyKey = customIdempotencyKey || `${userId}:${jobType}:${executionWindow}`;

    const userJobs = await this.queueRepo.getBackgroundJobs(userId);
    const existing = userJobs.find(
      (j) =>
        j.idempotencyKey === idempotencyKey &&
        (j.status === 'queued' || j.status === 'running' || j.status === 'completed')
    );

    if (existing) {
      return existing;
    }

    const job: BackgroundJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      jobType,
      automationId: payload?.automationId,
      idempotencyKey,
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: 'queued',
      progress: 0,
      result: payload || null,
      attempt: 1,
      maxAttempts: 3,
      retryCount: 0,
      logs: [`[${new Date().toISOString()}] Job enqueued with idempotencyKey: ${idempotencyKey}`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.queueRepo.saveBackgroundJob(userId, job);
  }

  async cancelJob(userId: string, id: string): Promise<BackgroundJob> {
    if (!userId) throw new Error('User ID is required');
    const cancelled = await this.queueRepo.cancelJob(userId, id);
    if (!cancelled) {
      throw new Error(`Job not found or unauthorized: ${id}`);
    }
    return cancelled;
  }

  async retryJob(userId: string, id: string): Promise<BackgroundJob> {
    if (!userId) throw new Error('User ID is required');
    const job = await this.queueRepo.getJobById(userId, id);
    if (!job) {
      throw new Error(`Job not found or unauthorized: ${id}`);
    }

    job.status = 'queued';
    job.progress = 0;
    job.retryCount = (job.retryCount || 0) + 1;
    job.attempt = (job.attempt || 1) + 1;
    job.logs.push(`[${new Date().toISOString()}] Job marked for retry (attempt ${job.attempt}/${job.maxAttempts || 3}).`);
    job.updatedAt = new Date().toISOString();

    return this.queueRepo.saveBackgroundJob(userId, job);
  }
}
