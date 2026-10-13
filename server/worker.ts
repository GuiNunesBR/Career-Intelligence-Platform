import {
  jobQueueRepository,
  careerLakeRepository,
  jobRepository,
  analysisRepository,
  aiService,
  tailoringService,
} from './container.js';
import { JobScraperService } from './services/job-scraper.service.js';
import { AIError } from './ai-provider.js';
import { buildResumeImport } from './services/resume-import.service.js';
import { runPlanSearch, sanitizePlan, planFromLegacyAgent } from './services/job-search.service.js';
import { screenJobPostings, verifyRuleClaims } from './ai-search.js';
import { PLAN_LIMITS, recommend } from '../src/shared/searchPlan.js';
import { randomUUID } from 'crypto';
import { BackgroundJob } from '../src/shared/types.js';

const MAX_RETRIES = 3;

export class BackgroundWorker {
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    if (process.env.NODE_ENV !== 'test') {
      this.startScheduler();
    }
  }

  public startScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    // Poll queue every 3 seconds; unref so it does not block node process exit
    this.timer = setInterval(() => {
      if (process.env.NODE_ENV === 'test') return;
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
        (j: BackgroundJob) =>
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

    try {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.progress = 10;
      job.logs.push(`[${new Date().toISOString()}] Worker assigned job. Target user scope: ${userId}`);
      await jobQueueRepository.saveBackgroundJob(userId, job);

      const lake = await careerLakeRepository.getUserLake(userId);

      if (job.jobType === 'nightly_analysis' || job.jobType === 'batch_job_refresh') {
        const jobs = await jobRepository.getJobs(userId);
        job.logs.push(`[${new Date().toISOString()}] Processing batch re-analysis for ${jobs.length} jobs.`);
        job.progress = 30;
        await jobQueueRepository.saveBackgroundJob(userId, job);

        let analyzedCount = 0;
        let failedCount = 0;
        for (const [idx, j] of jobs.entries()) {
          try {
            const analysisData = await aiService.analyzeFit(lake, j);
            await analysisRepository.saveAnalysis(userId, {
              ...analysisData,
              id: `fit_${Date.now()}_${j.id}`,
              userId,
              jobId: j.id,
              createdAt: new Date().toISOString(),
            });
            analyzedCount++;
            job.logs.push(`[${new Date().toISOString()}] Re-analyzed fit for: "${j.title}" at ${j.company}`);
          } catch (e: any) {
            failedCount++;
            job.logs.push(`[${new Date().toISOString()}] Fit analysis failed for "${j.title}": ${e.message}`);
          }
          job.progress = Math.round(30 + ((idx + 1) / Math.max(1, jobs.length)) * 60);
          await jobQueueRepository.saveBackgroundJob(userId, job);
        }

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = { jobsProcessed: analyzedCount, jobsFailed: failedCount, status: failedCount ? 'partial' : 'success' };
        job.logs.push(`[${new Date().toISOString()}] Batch re-analysis finished: ${analyzedCount} analyzed, ${failedCount} failed.`);
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
      } else if (job.jobType === 'document_parse') {
        job.progress = 20;
        job.logs.push(`[${new Date().toISOString()}] Starting document parsing via AI...`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        const rawText = job.payload?.rawText;
        if (!rawText) {
          throw new Error('No raw text provided for document parsing');
        }

        const parsedData = await aiService.parseResumeToLake(rawText);
        job.progress = 70;
        job.logs.push(`[${new Date().toISOString()}] CV successfully parsed by AI. Inserting into Career Lake...`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        // Grounding checks (excerpts/metrics vs. resume text), then merge into the Lake
        const { payload, report } = buildResumeImport(parsedData, rawText, job.payload?.extractionWarnings || []);
        const merge = await careerLakeRepository.importResume(userId, payload);

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = { parsed: true, ...report, merge };
        job.logs.push(`[${new Date().toISOString()}] CV successfully parsed and inserted into Career Lake.`);
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
      } else if (job.jobType === 'job_search_agent') {
        job.progress = 5;
        const plan = job.payload?.plan ? sanitizePlan(job.payload.plan) : planFromLegacyAgent(job.payload);
        if (!plan.terms.length) throw new Error('A busca não tem termos.');
        const log = async (message: string) => {
          job.logs.push(`[${new Date().toISOString()}] ${message}`);
          job.progress = Math.min(95, job.progress + 2);
          await jobQueueRepository.saveBackgroundJob(userId, job);
        };
        await log(
          `Plano: ${plan.terms.length} termos × ${plan.locations.length} locais, últimos ${plan.postedWithinDays} dias, meta de ${plan.targetResults} vagas.`
        );

        const existingJobs = await jobRepository.getJobs(userId);
        const { items, discarded, alreadySavedJobIds, stats } = await runPlanSearch(plan, lake, existingJobs, {
          scraper: new JobScraperService(),
          screen: screenJobPostings,
          verify: verifyRuleClaims,
          ai: aiService,
          log,
        });

        // Every kept job is saved (analyzed or not), in ranking order
        const rankedJobIds: string[] = [];
        const toTailor: string[] = [];
        for (const item of items) {
          const now = new Date().toISOString();
          const saved = {
            ...item.job,
            searchMeta: { ...item.job.searchMeta, searchRunId: job.id },
            id: `job_${randomUUID()}`,
            userId,
            createdAt: now,
            updatedAt: now,
          };
          await jobRepository.saveJob(userId, saved);
          rankedJobIds.push(saved.id);
          if (item.analysis) {
            const analysis = { ...item.analysis, id: `fit_${randomUUID()}`, userId, jobId: saved.id, createdAt: now };
            await analysisRepository.saveAnalysis(userId, analysis);
            if (recommend(analysis).verdict === 'Sim') toTailor.push(saved.id);
          }
        }

        // Tailored ATS CV for the recommended jobs
        let cvsGenerated = 0;
        if (plan.autoTailorCv && toTailor.length) {
          const batch = toTailor.slice(0, PLAN_LIMITS.maxAutoCv);
          await log(`Gerando CV ATS para ${batch.length} vagas recomendadas.`);
          for (const jobId of batch) {
            try {
              await tailoringService.generateTailoredCV(userId, jobId, 'balanced');
              cvsGenerated++;
            } catch (e: any) {
              await log(`Não foi possível gerar o CV de uma vaga: ${e.message}`);
            }
          }
        }

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = {
          prompt: job.payload?.prompt || null,
          plan,
          stats: { ...stats, saved: items.length, cvsGenerated },
          rankedJobIds,
          discarded,
          alreadySavedJobIds,
        };
        job.logs.push(
          `[${new Date().toISOString()}] Busca concluída: ${stats.searches} buscas, ${stats.cardsFound} resultados, ${stats.uniqueCards} únicos, ${stats.opened} abertas, ${stats.passed} passaram nos filtros, ${stats.analyzed} analisadas, ${cvsGenerated} CVs gerados.`
        );
        await jobQueueRepository.saveBackgroundJob(userId, job);
      } else {
        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        await jobQueueRepository.saveBackgroundJob(userId, job);
      }
    } catch (err: any) {
      console.error(`Error processing background job ${job.id}:`, err);

      // If the job was deleted concurrently, do not try to save it back
      if (err.message?.includes('Concurrency error: Background job')) {
        return;
      }

      job.retryCount = (job.retryCount || 0) + 1;
      job.logs.push(`[${new Date().toISOString()}] ERROR: ${err.message || 'Execution error'}`);

      // Configuration errors (missing key, unknown model) won't fix themselves on retry
      // A search is not retried automatically: each attempt repeats dozens of LinkedIn requests
      const permanent =
        job.jobType === 'job_search_agent' ||
        (err instanceof AIError && (err.code === 'AI_NOT_CONFIGURED' || err.code === 'AI_MODEL_NOT_FOUND'));

      if (!permanent && job.retryCount < MAX_RETRIES) {
        job.status = 'queued';
        job.progress = 0;
        job.logs.push(`[${new Date().toISOString()}] Re-queuing job for retry attempt ${job.retryCount + 1}/${MAX_RETRIES}`);
      } else {
        job.status = 'failed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(`[${new Date().toISOString()}] Job marked as failed after ${job.retryCount} attempt(s).`);
      }

      try {
        await jobQueueRepository.saveBackgroundJob(userId, job);
      } catch (saveErr) {
        console.error(`Failed to save error state for job ${job.id}:`, saveErr);
      }
    }
  }
}

export const worker = new BackgroundWorker();
