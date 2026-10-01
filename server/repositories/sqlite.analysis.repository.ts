import { eq, and } from 'drizzle-orm';
import { IAnalysisRepository } from './interfaces.js';
import { FitAnalysis } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { fitAnalyses } from '../db/schema.js';

export class SqliteAnalysisRepository implements IAnalysisRepository {
  async getAnalyses(userId: string): Promise<FitAnalysis[]> {
    const result = await db.select().from(fitAnalyses).where(eq(fitAnalyses.userId, userId));
    return result.map(a => ({
      ...a,
      dimensions: a.dimensions as any,
      evidenceMatrix: a.evidenceMatrix as any,
      createdAt: a.createdAt,
    }));
  }

  async getAnalysisForJob(userId: string, jobId: string): Promise<FitAnalysis | null> {
    const result = await db.select().from(fitAnalyses).where(and(eq(fitAnalyses.userId, userId), eq(fitAnalyses.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      dimensions: a.dimensions as any,
      evidenceMatrix: a.evidenceMatrix as any,
      createdAt: a.createdAt,
    };
  }

  async saveAnalysis(userId: string, analysis: FitAnalysis): Promise<FitAnalysis> {
    const existing = await this.getAnalysisForJob(userId, analysis.jobId);
    if (existing) {
      const [updated] = await db.update(fitAnalyses).set({
        overallSummary: analysis.overallSummary,
        dimensions: analysis.dimensions,
        evidenceMatrix: analysis.evidenceMatrix,
        strongMatches: analysis.strongMatches,
        transferableExperiences: analysis.transferableExperiences,
        domainGaps: analysis.domainGaps,
        missingEvidence: analysis.missingEvidence,
        recommendedCvFocus: analysis.recommendedCvFocus,
      }).where(and(eq(fitAnalyses.userId, userId), eq(fitAnalyses.id, analysis.id))).returning();
      
      return {
        ...updated,
        dimensions: updated.dimensions as any,
        evidenceMatrix: updated.evidenceMatrix as any,
        createdAt: updated.createdAt,
      };
    } else {
      const [inserted] = await db.insert(fitAnalyses).values({
        id: analysis.id,
        userId,
        jobId: analysis.jobId,
        overallSummary: analysis.overallSummary,
        dimensions: analysis.dimensions,
        evidenceMatrix: analysis.evidenceMatrix,
        strongMatches: analysis.strongMatches,
        transferableExperiences: analysis.transferableExperiences,
        domainGaps: analysis.domainGaps,
        missingEvidence: analysis.missingEvidence,
        recommendedCvFocus: analysis.recommendedCvFocus,
      }).returning();
      
      return {
        ...inserted,
        dimensions: inserted.dimensions as any,
        evidenceMatrix: inserted.evidenceMatrix as any,
        createdAt: inserted.createdAt,
      };
    }
  }
}
