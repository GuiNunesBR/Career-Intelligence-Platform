import { db } from '../db.js';
import { Job } from '../../src/shared/types.js';
import { IJobRepository } from './interfaces.js';

export class JobRepository implements IJobRepository {
  async getJobs(userId: string): Promise<Job[]> {
    return db.getJobs(userId);
  }

  async getJobById(userId: string, jobId: string): Promise<Job | null> {
    const jobs = db.getJobs(userId);
    return jobs.find((j) => j.id === jobId) || null;
  }

  async saveJob(userId: string, job: Job): Promise<Job> {
    db.saveJob(userId, { ...job, userId });
    return job;
  }

  async deleteJob(userId: string, jobId: string): Promise<boolean> {
    return db.deleteJob(userId, jobId);
  }
}

export const jobRepository = new JobRepository();
