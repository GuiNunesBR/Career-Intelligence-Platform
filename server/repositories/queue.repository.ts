import { db } from '../db.js';
import { BackgroundJob } from '../../src/shared/types.js';
import { IJobQueueRepository } from './interfaces.js';

export class JobQueueRepository implements IJobQueueRepository {
  async getBackgroundJobs(userId: string): Promise<BackgroundJob[]> {
    return db.getBackgroundJobs(userId);
  }

  async getJobById(userId: string, id: string): Promise<BackgroundJob | null> {
    const jobs = db.getBackgroundJobs(userId);
    return jobs.find((j) => j.id === id) || null;
  }

  async getAllPendingJobs(): Promise<BackgroundJob[]> {
    return db.getAllPendingJobs();
  }

  async saveBackgroundJob(userId: string, job: BackgroundJob): Promise<BackgroundJob> {
    const scopedJob = { ...job, userId };
    db.saveBackgroundJob(userId, scopedJob);
    return scopedJob;
  }

  async cancelJob(userId: string, id: string): Promise<BackgroundJob | null> {
    const job = await this.getJobById(userId, id);
    if (!job) return null;

    if (job.status === 'completed' || job.status === 'cancelled') {
      return job;
    }

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toISOString()}] Job explicitly cancelled by user.`);
    await this.saveBackgroundJob(userId, job);
    return job;
  }
}

export const jobQueueRepository = new JobQueueRepository();
