import { IAnalysisRepository, IJobRepository, ICareerLakeRepository } from '../repositories/interfaces.js';
import { AIService } from './ai.service.js';
import { FitAnalysisAIOutputSchema } from '../validation/ai_schemas.js';
import { FitAnalysis } from '../../src/shared/types.js';

export class AnalysisService {
  constructor(
    private analysisRepo: IAnalysisRepository,
    private jobRepo: IJobRepository,
    private lakeRepo: ICareerLakeRepository,
    private ai: AIService
  ) {}

  async getAnalysisForJob(userId: string, jobId: string): Promise<FitAnalysis | null> {
    if (!userId) throw new Error('User ID is required');
    return this.analysisRepo.getAnalysisForJob(userId, jobId);
  }

  async runFitAnalysis(userId: string, jobId: string): Promise<FitAnalysis> {
    if (!userId) throw new Error('User ID is required');
    const job = await this.jobRepo.getJobById(userId, jobId);
    if (!job) {
      throw new Error(`Job not found or access denied: ${jobId}`);
    }
    if (job.userId !== userId) {
      throw new Error(`Job access forbidden: job does not belong to authenticated user`);
    }

    const lake = await this.lakeRepo.getUserLake(userId);
    const rawAnalysisData = await this.ai.analyzeFit(lake, job);

    // 1. Rigorous AI Output Schema Validation
    const parsedAnalysis = FitAnalysisAIOutputSchema.parse(rawAnalysisData);

    // 2. Strict Evidence & Source Ownership Validation
    const validatedMatrix = parsedAnalysis.evidenceMatrix.map((item) => {
      const sanitizedReferences = item.sourceReferences.filter((ref) => {
        if (ref.type === 'evidence') {
          return lake.evidences.some((ev) => ev.id === ref.id && ev.userId === userId);
        }
        if (ref.type === 'experience') {
          return lake.experiences.some((exp) => exp.id === ref.id && exp.userId === userId);
        }
        if (ref.type === 'project') {
          return lake.projects.some((proj) => proj.id === ref.id && proj.userId === userId);
        }
        if (ref.type === 'skill') {
          return lake.skills.some((sk) => sk.id === ref.id && sk.userId === userId);
        }
        return false;
      });

      return {
        ...item,
        sourceReferences: sanitizedReferences,
      };
    });

    const fitAnalysis: FitAnalysis = {
      ...parsedAnalysis,
      id: `fit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      jobId,
      evidenceMatrix: validatedMatrix,
      createdAt: new Date().toISOString(),
    };

    return this.analysisRepo.saveAnalysis(userId, fitAnalysis);
  }
}
