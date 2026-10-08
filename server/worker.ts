import {
  jobQueueRepository,
  careerLakeRepository,
  jobRepository,
  analysisRepository,
  aiService
} from './container.js';
import { jobScraperService } from './services/job-scraper.service.js';
import { AIError } from './ai-provider.js';
import { headlineScore } from '../src/shared/fitScore.js';
import { buildResumeImport } from './services/resume-import.service.js';
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
        job.progress = 20;
        job.logs.push(`[${new Date().toISOString()}] Started Job Search Agent for user ${userId}.`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        job.logs.push(`[${new Date().toISOString()}] Searching external job boards...`);
        job.progress = 40;
        await jobQueueRepository.saveBackgroundJob(userId, job);

        const roles = job.payload?.roles || 'Software Engineer';
        const location = job.payload?.location || 'Anywhere';
        const mode = job.payload?.mode || 'Remote';
        const seniority = job.payload?.seniority || '';

        job.logs.push(`[${new Date().toISOString()}] Searching for: ${roles} | Location: ${location} | Mode: ${mode}`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        const existingJobs = await jobRepository.getJobs(userId);
        const existingUrls = new Set(existingJobs.map(j => j.url).filter(Boolean));

        // Use external API (RapidAPI JSearch) to find real jobs
        const scrapedJobs = await jobScraperService.searchJobs(roles, location, mode, 50);

        const newJobsToAnalyze = scrapedJobs.filter(j => {
          if (j.url && existingUrls.has(j.url)) return false;

          const lowerTitle = j.title.toLowerCase();
          const isIntern = lowerTitle.includes('estágio') || lowerTitle.includes('estagio') || lowerTitle.includes('intern');
          const isCoordinator = lowerTitle.includes('coordenador') || lowerTitle.includes('coord');
          const isManager = lowerTitle.includes('gerente') || lowerTitle.includes('manager');

          const sLower = seniority.toLowerCase();
          if (!sLower.includes('liderança') && !sLower.includes('especialista') && (isCoordinator || isManager)) return false;
          if (!sLower.includes('estágio') && !sLower.includes('estagio') && isIntern) return false;

          return true;
        }).slice(0, 15);

        job.logs.push(`[${new Date().toISOString()}] Encontradas ${newJobsToAnalyze.length} vagas NOVAS na página. Iniciando processamento de IA...`);
        await jobQueueRepository.saveBackgroundJob(userId, job);

        let processed = 0;
        const evaluatedJobs: Array<{ job: any; analysis: any | null }> = [];

        for (const mJob of newJobsToAnalyze) {
          let tempJob: any = null;
          try {
            let fullDescription = '';
            if (mJob.url) {
              job.logs.push(`[${new Date().toISOString()}] Fetching full description for "${mJob.title}"...`);
              await jobQueueRepository.saveBackgroundJob(userId, job);
              fullDescription = await jobScraperService.fetchJobDescription(mJob.url);
              // avoid immediate rate limit from LinkedIn
              await new Promise(r => setTimeout(r, 1000));
            }

            const now = new Date().toISOString();
            tempJob = {
              ...mJob,
              id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              userId,
              createdAt: now,
              updatedAt: now,
              requirements: [],
            };

            if (!fullDescription) {
              // The scraper's stub text is not a job description: analyzing it would produce a meaningless score
              job.logs.push(`[${new Date().toISOString()}] Sem descrição completa para "${mJob.title}". Vaga salva como não analisada.`);
              evaluatedJobs.push({ job: tempJob, analysis: null });
            } else {
              const rawTextToAnalyze = `Vaga: ${mJob.title}\nEmpresa: ${mJob.company}\nLocal: ${mJob.location}\nDescrição:\n${fullDescription}`;
              tempJob.rawText = rawTextToAnalyze;
              tempJob.description = fullDescription;

              const parsed = await aiService.parseJob(rawTextToAnalyze);
              tempJob.requirements = parsed.requirements;
              tempJob.seniority = parsed.seniority;

              job.logs.push(`[${new Date().toISOString()}] Found: "${tempJob.title}" at ${tempJob.company}. Running Fit Analysis...`);
              await jobQueueRepository.saveBackgroundJob(userId, job);

              const analysisData = await aiService.analyzeFit(lake, tempJob);
              evaluatedJobs.push({ job: tempJob, analysis: analysisData });
            }
          } catch (e: any) {
            job.logs.push(`[${new Date().toISOString()}] Erro ao analisar vaga "${mJob.title}": ${e.message}. Vaga salva como não analisada.`);
            if (tempJob) evaluatedJobs.push({ job: tempJob, analysis: null });
          }

          processed++;
          job.progress = 40 + (processed * (50 / newJobsToAnalyze.length));

          if (processed < newJobsToAnalyze.length) {
            job.logs.push(`[${new Date().toISOString()}] Waiting 12s to avoid Gemini API Rate Limits...`);
            await jobQueueRepository.saveBackgroundJob(userId, job);
            await new Promise(r => setTimeout(r, 12000));
          }
        }

        // Save the top 10 analyzed jobs, plus every job that could not be analyzed (so none silently disappear)
        const analyzed = evaluatedJobs
          .filter((item) => item.analysis)
          .sort((a, b) => (headlineScore(b.analysis) ?? -1) - (headlineScore(a.analysis) ?? -1));
        const notAnalyzed = evaluatedJobs.filter((item) => !item.analysis);
        const toSave = [...analyzed.slice(0, 10), ...notAnalyzed];

        job.logs.push(`[${new Date().toISOString()}] Salvando ${Math.min(10, analyzed.length)} vagas analisadas (de ${analyzed.length}) e ${notAnalyzed.length} não analisadas...`);

        for (const item of toSave) {
          await jobRepository.saveJob(userId, item.job);
          if (!item.analysis) continue;
          await analysisRepository.saveAnalysis(userId, {
            ...item.analysis,
            id: `fit_${Date.now()}_${item.job.id}`,
            userId,
            jobId: item.job.id,
            createdAt: new Date().toISOString()
          });
        }

        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = new Date().toISOString();
        job.result = {
          jobsFound: scrapedJobs.length,
          topFitSaved: Math.min(10, analyzed.length),
          notAnalyzedSaved: notAnalyzed.length,
          status: notAnalyzed.length ? 'partial' : 'success',
        };
        job.logs.push(`[${new Date().toISOString()}] Job Search completed successfully.`);
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
      const permanent = err instanceof AIError && (err.code === 'AI_NOT_CONFIGURED' || err.code === 'AI_MODEL_NOT_FOUND');

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
