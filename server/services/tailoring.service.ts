import { ITailoringRepository, IJobRepository, ICareerLakeRepository } from '../repositories/interfaces.js';
import { AIService } from './ai.service.js';
import { TailoringCVAIOutputSchema, CoverLetterAIOutputSchema } from '../validation/ai_schemas.js';
import { TailoredCV, CoverLetter, TailoringMode } from '../../src/shared/types.js';

export class TailoringService {
  constructor(
    private tailoringRepo: ITailoringRepository,
    private jobRepo: IJobRepository,
    private lakeRepo: ICareerLakeRepository,
    private ai: AIService
  ) {}

  async getTailoredCV(userId: string, jobId: string): Promise<TailoredCV | null> {
    if (!userId) throw new Error('User ID is required');
    return this.tailoringRepo.getTailoredCVForJob(userId, jobId);
  }

  async getCoverLetter(userId: string, jobId: string): Promise<CoverLetter | null> {
    if (!userId) throw new Error('User ID is required');
    return this.tailoringRepo.getCoverLetterForJob(userId, jobId);
  }

  async generateTailoredCV(userId: string, jobId: string, mode: TailoringMode): Promise<TailoredCV> {
    if (!userId) throw new Error('User ID is required');
    const job = await this.jobRepo.getJobById(userId, jobId);
    if (!job) {
      throw new Error(`Job not found or access denied: ${jobId}`);
    }
    if (job.userId !== userId) {
      throw new Error(`Job access forbidden: job does not belong to authenticated user`);
    }

    const lake = await this.lakeRepo.getUserLake(userId);
    const rawCvData = await this.ai.tailorCV(lake, job, mode);

    // 1. Rigorous AI Output Schema Validation
    const parsedCV = TailoringCVAIOutputSchema.parse(rawCvData);

    // 2. Ownership & Grounding Validation
    // Validate that selectedExperiences exist in user's Career Lake and belong to userId
    const validatedExperiences = parsedCV.selectedExperiences.filter((exp) =>
      lake.experiences.some((e) => e.id === exp.experienceId && e.userId === userId)
    );

    // If AI proposed experiences but all failed grounding (100% invalid/hallucinated/foreign)
    if (parsedCV.selectedExperiences.length > 0 && validatedExperiences.length === 0) {
      throw new Error(
        'AI_OUTPUT_INVALID: All AI selected experiences failed grounding validation against the user Career Lake'
      );
    }

    // Strip any hallucinated or foreign evidence citations within experiences
    const userEvidenceIds = new Set(
      lake.evidences.filter((ev) => ev.userId === userId).map((ev) => ev.id)
    );

    const sanitizedExperiences = validatedExperiences.map((exp) => ({
      ...exp,
      evidenceCitations: (exp.evidenceCitations || []).filter((id) => userEvidenceIds.has(id)),
    }));

    // Ground skills evidence references
    const sanitizedSkills = (parsedCV.selectedSkills || []).map((skill) => ({
      ...skill,
      evidenceRef: skill.evidenceRef && userEvidenceIds.has(skill.evidenceRef) ? skill.evidenceRef : '',
    }));

    // Ground projects references (if projectId provided by AI, ensure it exists in lake and belongs to userId)
    const userProjectIds = new Set(
      lake.projects.filter((p) => p.userId === userId).map((p) => p.id)
    );
    const sanitizedProjects = (parsedCV.selectedProjects || []).map((proj) => ({
      ...proj,
      projectId: proj.projectId && userProjectIds.has(proj.projectId) ? proj.projectId : undefined,
    }));

    const cv: TailoredCV = {
      ...parsedCV,
      id: `cv_${Date.now()}_${mode}`,
      userId,
      jobId,
      selectedExperiences: sanitizedExperiences,
      selectedSkills: sanitizedSkills,
      selectedProjects: sanitizedProjects,
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
