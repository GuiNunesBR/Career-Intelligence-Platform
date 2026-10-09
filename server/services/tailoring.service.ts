import { ITailoringRepository, IJobRepository, ICareerLakeRepository, IAnalysisRepository } from '../repositories/interfaces.js';
import { AIService } from './ai.service.js';
import { CoverLetterAIOutputSchema } from '../validation/ai_schemas.js';
import { groundTailoredCV } from './cv-grounding.service.js';
import { detectLanguage } from '../../src/shared/text.js';
import { randomUUID } from 'crypto';
import { TailoredCV, CoverLetter, TailoringMode } from '../../src/shared/types.js';

export class TailoringService {
  constructor(
    private tailoringRepo: ITailoringRepository,
    private jobRepo: IJobRepository,
    private lakeRepo: ICareerLakeRepository,
    private ai: AIService,
    /** Optional: when present, the job's fit analysis guides which evidences the CV uses. */
    private analysisRepo?: IAnalysisRepository
  ) {}

  async getTailoredCV(userId: string, jobId: string): Promise<TailoredCV | null> {
    if (!userId) throw new Error('User ID is required');
    return this.tailoringRepo.getTailoredCVForJob(userId, jobId);
  }

  async getCoverLetter(userId: string, jobId: string): Promise<CoverLetter | null> {
    if (!userId) throw new Error('User ID is required');
    return this.tailoringRepo.getCoverLetterForJob(userId, jobId);
  }

  async generateTailoredCV(userId: string, jobId: string, mode: TailoringMode, language?: string): Promise<TailoredCV> {
    if (!userId) throw new Error('User ID is required');
    const job = await this.jobRepo.getJobById(userId, jobId);
    if (!job) {
      throw new Error(`Job not found or access denied: ${jobId}`);
    }
    if (job.userId !== userId) {
      throw new Error(`Job access forbidden: job does not belong to authenticated user`);
    }

    const lake = await this.lakeRepo.getUserLake(userId);
    // CV language follows the job posting unless the user chose one
    const cvLanguage = language || detectLanguage(`${job.title}\n${job.description}`);
    const analysis = this.analysisRepo ? await this.analysisRepo.getAnalysisForJob(userId, jobId) : null;

    // 1st attempt; if the fact checker rejects content, one retry with the reasons, then keep what passed
    let raw: any = await this.ai.tailorCV(lake, job, mode, { language: cvLanguage, analysis });
    let grounded = groundTailoredCV(raw, lake, userId, cvLanguage);
    if (grounded.issues.length > 0) {
      const feedback = grounded.issues.map((i) => `${i.where}: "${i.text}" → ${i.reason}`);
      try {
        const retryRaw: any = await this.ai.tailorCV(lake, job, mode, { language: cvLanguage, analysis, feedback });
        const retry = groundTailoredCV(retryRaw, lake, userId, cvLanguage);
        if (retry.issues.length < grounded.issues.length) {
          raw = retryRaw;
          grounded = retry;
        }
      } catch {
        // Keep the first attempt (already grounded) if the retry fails
      }
    }

    // If the model proposed experiences but none belong to this user, nothing can be trusted
    const proposed = Array.isArray(raw?.selectedExperiences) ? raw.selectedExperiences.length : 0;
    if (proposed > 0 && grounded.selectedExperiences.length === 0) {
      throw Object.assign(
        new Error('O modelo de IA selecionou experiências que não existem no seu Career Lake; nada foi salvo. Tente gerar novamente.'),
        { status: 422, code: 'AI_OUTPUT_INVALID' }
      );
    }

    const removed = grounded.issues.length;
    const cv: TailoredCV = {
      id: `cv_${randomUUID()}`,
      userId,
      jobId,
      mode,
      language: cvLanguage as TailoredCV['language'],
      headline: grounded.headline,
      summary: grounded.summary,
      selectedExperiences: grounded.selectedExperiences,
      selectedSkills: grounded.selectedSkills,
      selectedProjects: grounded.selectedProjects,
      jobKeywords: Array.isArray(raw?.jobKeywords) ? raw.jobKeywords : [],
      atsKeywordsMatched: Array.isArray(raw?.atsKeywordsMatched) ? raw.atsKeywordsMatched : [],
      honestyAuditNotes: [
        ...(Array.isArray(raw?.honestyAuditNotes) ? raw.honestyAuditNotes : []),
        removed
          ? `Checagem de fatos: ${removed} trecho(s) removido(s) por não terem fonte no Career Lake.`
          : 'Checagem de fatos: todos os bullets citam evidências do Career Lake e todos os números foram encontrados nelas.',
      ],
      groundingIssues: grounded.issues,
      createdAt: new Date().toISOString(),
    };

    return this.tailoringRepo.saveTailoredCV(userId, cv);
  }

  async generateCoverLetter(userId: string, jobId: string): Promise<CoverLetter> {
    if (!userId) throw new Error('User ID is required');
    const job = await this.jobRepo.getJobById(userId, jobId);
    if (!job) {
      throw new Error(`Job not found or access denied: ${jobId}`);
    }
    if (job.userId !== userId) {
      throw new Error(`Job access forbidden: job does not belong to authenticated user`);
    }

    const lake = await this.lakeRepo.getUserLake(userId);
    const rawLetterData = await this.ai.generateCoverLetter(lake, job);

    // 1. AI Output Schema Validation
    const parsedLetter = CoverLetterAIOutputSchema.parse(rawLetterData);

    const letter: CoverLetter = {
      ...parsedLetter,
      id: `cl_${Date.now()}`,
      userId,
      jobId,
      createdAt: new Date().toISOString(),
    };

    return this.tailoringRepo.saveCoverLetter(userId, letter);
  }
}
