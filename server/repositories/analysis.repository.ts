import { db } from '../db.js';
import { FitAnalysis } from '../../src/shared/types.js';
import { IAnalysisRepository } from './interfaces.js';

export class AnalysisRepository implements IAnalysisRepository {
  getAnalyses(userId: string): FitAnalysis[] {
    return db.getAnalyses(userId);
  }

  getAnalysisForJob(userId: string, jobId: string): FitAnalysis | null {
    const list = db.getAnalyses(userId);
    return list.find((a) => a.jobId === jobId) || null;
  }

  saveAnalysis(userId: string, analysis: FitAnalysis): FitAnalysis {
    const scopedAnalysis = { ...analysis, userId };
    db.saveAnalysis(userId, scopedAnalysis);
    return scopedAnalysis;
  }
}

export const analysisRepository = new AnalysisRepository();
