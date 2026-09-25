import {
  parseJobText,
  performEvidenceFitAnalysis,
  generateTailoredCVContent,
  generateCoverLetterContent,
} from '../ai.js';
import { JobParsingAIOutputSchema } from '../validation/ai_schemas.js';
import {
  UserCareerLake,
  Job,
  FitAnalysis,
  TailoredCV,
  CoverLetter,
  TailoringMode,
} from '../../src/shared/types.js';

export class AIService {
  async parseJob(rawText: string): Promise<Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    const raw = await parseJobText(rawText);
    const parsed = JobParsingAIOutputSchema.parse(raw);
    return {
      ...parsed,
      rawText,
      requirements: parsed.requirements.map((r, idx) => ({
        requirementId: r.requirementId || `req_${Date.now()}_${idx}`,
        category: r.category as any,
        description: r.description,
        importance: r.importance,
        evidenceRequired: r.evidenceRequired,
      })),
    };
  }

  async analyzeFit(lake: UserCareerLake, job: Job): Promise<Omit<FitAnalysis, 'id' | 'userId' | 'createdAt'>> {
    return performEvidenceFitAnalysis(lake, job);
  }

  async tailorCV(
    lake: UserCareerLake,
    job: Job,
    mode: TailoringMode
  ): Promise<Omit<TailoredCV, 'id' | 'userId' | 'createdAt'>> {
    return generateTailoredCVContent(lake, job, mode);
  }

  async generateCoverLetter(
    lake: UserCareerLake,
    job: Job
  ): Promise<Omit<CoverLetter, 'id' | 'userId' | 'createdAt'>> {
    return generateCoverLetterContent(lake, job);
  }
}

export const aiService = new AIService();
