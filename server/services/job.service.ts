import { IJobRepository } from '../repositories/interfaces.js';
import { Job } from '../../src/shared/types.js';

export class JobService {
  constructor(private jobRepo: IJobRepository) {}

  async getJobs(userId: string): Promise<Job[]> {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.getJobs(userId);
  }

  async getJobById(userId: string, jobId: string): Promise<Job | null> {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.getJobById(userId, jobId);
  }

  async createJob(userId: string, jobData: Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Job> {
    if (!userId) throw new Error('User ID is required');
    const now = new Date().toISOString();
    const newJob: Job = {
      ...jobData,
      id: jobData.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    return this.jobRepo.saveJob(userId, newJob);
  }

  async deleteJob(userId: string, jobId: string): Promise<boolean> {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.deleteJob(userId, jobId);
  }
}
