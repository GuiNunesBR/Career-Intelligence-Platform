import { db } from '../db.js';
import { BackgroundJob } from '../../src/shared/types.js';
import { IJobQueueRepository } from './interfaces.js';

export class JobQueueRepository implements IJobQueueRepository {
  getBackgroundJobs(userId: string): BackgroundJob[] {
    return db.getBackgroundJobs(userId);
  }

  getJobById(userId: string, id: string): BackgroundJob | null {
    const jobs = db.getBackgroundJobs(userId);
    return jobs.find((j) => j.id === id) || null;
  }

  getAllPendingJobs(): BackgroundJob[] {
    return db.getAllPendingJobs();
  }

  saveBackgroundJob(userId: string, job: BackgroundJob): BackgroundJob {
    const scopedJob = { ...job, userId };
    db.saveBackgroundJob(userId, scopedJob);
    return scopedJob;
  }

  cancelJob(userId: string, id: string): BackgroundJob | null {
    const job = this.getJobById(userId, id);
    if (!job) return null;

    if (job.status === 'completed' || job.status === 'cancelled') {
      return job;
    }

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    job.logs.push(`[${new Date().toISOString()}] Job explicitly cancelled by user.`);
    this.saveBackgroundJob(userId, job);
    return job;
  }
}

export const jobQueueRepository = new JobQueueRepository();
