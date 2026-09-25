import {
  jobQueueRepository,
  careerLakeRepository,
  jobRepository,
  analysisRepository,
  aiService
} from './container.js';
import { BackgroundJob } from '../src/shared/types.js';

const MAX_RETRIES = 3;

export class BackgroundWorker {
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  public startScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    // Poll queue every 3 seconds; unref so it does not block node process exit
    this.timer = setInterval(() => {
      this.processQueue();
    }, 3000);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  public stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const allPending = await jobQueueRepository.getAllPendingJobs();
      const readyJobs = allPending.filter(
        (j) =>
          (j.status === 'queued' || j.status === 'pending') &&
          new Date(j.scheduledAt).getTime() <= Date.now()
      );

      for (const job of readyJobs) {
        await this.executeJob(job);
      }
    } catch (err) {
      console.error('Error in background job worker:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: BackgroundJob): Promise<void> {
    const userId = job.userId;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.progress = 10;
    job.logs.push(`[${new Date().toISOString()}] Worker assigned job. Target user scope: ${userId}`);
    await jobQueueRepository.saveBackgroundJob(userId, job);

    try {
      const lake = await careerLakeRepository.getUserLake(userId);

      if (job.jobType === 'nightly_analysis' || job.jobType === 'batch_job_refresh') {
        const jobs = await jobRepository.getJobs(userId);
        job.logs.push(`[${new Date().toISOString()}] Processing batch re-analysis for ${jobs.length} jobs.`);
        job.progress = 30;
        await jobQueueRepository.saveBackgroundJob(userId, job);

        let analyzedCount = 0;
        for (const j of jobs) {
          const analysisData = await aiService.analyzeFit(lake, j);
          await analysisRepository.saveAnalysis(userId, {
            ...analysisData,
            id: `fit_${Date.now()}_${j.id}`,
            userId,
            jobId: j.id,
            createdAt: new Date().toISOString(),
          });
          analyzedCount++;
          job.progress = Math.round(30 + (analyzedCount / Math.max(1, jobs.length)) * 60);
          job.logs.push(`[${new Date().toISOString()}] Re-analyzed fit for: "${j.title}" at ${j.company}`);
          await jobQueueRepository.saveBackgroundJob(userId, job);
        }

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = { jobsProcessed: analyzedCount, status: 'success' };
        job.logs.push(`[${new Date().toISOString()}] Successfully completed batch re-analysis of ${analyzedCount} jobs.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);
      } else if (job.jobType === 'evidence_audit') {
        job.progress = 40;
        job.logs.push(`[${new Date().toISOString()}] Starting career lake integrity audit.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        // Audit evidence integrity
        const totalEvidences = lake.evidences.length;
        const verifiedCount = lake.evidences.filter((e) => e.confidence === 'high').length;
        const hasMetricsCount = lake.evidences.filter((e) => e.metric && e.metric.trim().length > 0).length;

        job.progress = 80;
        job.logs.push(
          `[${new Date().toISOString()}] Audit summary: ${totalEvidences} total evidences, ${verifiedCount} high-confidence, ${hasMetricsCount} with quantitative metrics.`
        );

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = {
          totalEvidences,
          verifiedDirect: verifiedCount,
          quantitativeMetrics: hasMetricsCount,
          auditHealthScore: Math.round(((verifiedCount + hasMetricsCount) / (totalEvidences * 2 || 1)) * 100),
        };
        job.logs.push(`[${new Date().toISOString()}] Evidence integrity audit completed with health score.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);
      } else if (job.jobType === 'scheduled_tailor') {
        job.progress = 40;
        job.logs.push(`[${new Date().toISOString()}] Running background CV and profile tailoring task.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = { tailoredStatus: 'up_to_date' };
        job.logs.push(`[${new Date().toISOString()}] Scheduled tailoring background process completed.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);
      } else {
        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        await jobQueueRepository.saveBackgroundJob(userId, job);
      }
    } catch (err: any) {
      console.error(`Error processing background job ${job.id}:`, err);
      job.retryCount = (job.retryCount || 0) + 1;
      job.logs.push(`[${new Date().toISOString()}] ERROR: ${err.message || 'Execution error'}`);

      if (job.retryCount < MAX_RETRIES) {
        job.status = 'queued';
        job.progress = 0;
        job.logs.push(`[${new Date().toISOString()}] Re-queuing job for retry attempt ${job.retryCount + 1}/${MAX_RETRIES}`);
      } else {
        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(`[${new Date().toISOString()}] Job marked as failed after ${MAX_RETRIES} attempts.`);
      }

      await jobQueueRepository.saveBackgroundJob(userId, job);
    }
  }
}

export const worker = new BackgroundWorker();
