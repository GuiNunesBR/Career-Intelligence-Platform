import { db } from '../db.js';
import { Job } from '../../src/shared/types.js';
import { IJobRepository } from './interfaces.js';

export class JobRepository implements IJobRepository {
  getJobs(userId: string): Job[] {
    return db.getJobs(userId);
  }

  getJobById(userId: string, jobId: string): Job | null {
    const jobs = db.getJobs(userId);
    return jobs.find((j) => j.id === jobId) || null;
  }

  saveJob(userId: string, job: Job): Job {
    db.saveJob(userId, { ...job, userId });
    return job;
  }

  deleteJob(userId: string, jobId: string): boolean {
    return db.deleteJob(userId, jobId);
  }
}

export const jobRepository = new JobRepository();
