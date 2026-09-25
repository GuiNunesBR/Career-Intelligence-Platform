import { db } from '../db.js';
import { FitAnalysis } from '../../src/shared/types.js';
import { IAnalysisRepository } from './interfaces.js';

export class AnalysisRepository implements IAnalysisRepository {
  async getAnalyses(userId: string): Promise<FitAnalysis[]> {
    return db.getAnalyses(userId);
  }

  async getAnalysisForJob(userId: string, jobId: string): Promise<FitAnalysis | null> {
    const list = db.getAnalyses(userId);
    return list.find((a) => a.jobId === jobId) || null;
  }

  async saveAnalysis(userId: string, analysis: FitAnalysis): Promise<FitAnalysis> {
    const scopedAnalysis = { ...analysis, userId };
    db.saveAnalysis(userId, scopedAnalysis);
    return scopedAnalysis;
  }
}

export const analysisRepository = new AnalysisRepository();
