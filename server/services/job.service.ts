import { jobRepository, JobRepository } from '../repositories/job.repository.js';
import { Job } from '../../src/shared/types.js';

export class JobService {
  constructor(private jobRepo: JobRepository = jobRepository) {}

  getJobs(userId: string): Job[] {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.getJobs(userId);
  }

  getJobById(userId: string, jobId: string): Job | null {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.getJobById(userId, jobId);
  }

  createJob(userId: string, jobData: Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }): Job {
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

  deleteJob(userId: string, jobId: string): boolean {
    if (!userId) throw new Error('User ID is required');
    return this.jobRepo.deleteJob(userId, jobId);
  }
}

export const jobService = new JobService();
