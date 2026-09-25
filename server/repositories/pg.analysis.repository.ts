import { eq, and } from 'drizzle-orm';
import { IAnalysisRepository } from './interfaces.js';
import { FitAnalysis } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { fitAnalyses } from '../db/schema.js';

export class PgAnalysisRepository implements IAnalysisRepository {
  getAnalyses(userId: string): FitAnalysis[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getAnalysesAsync(userId: string): Promise<FitAnalysis[]> {
    const result = await db.select().from(fitAnalyses).where(eq(fitAnalyses.userId, userId));
    return result.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  getAnalysisForJob(userId: string, jobId: string): FitAnalysis | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getAnalysisForJobAsync(userId: string, jobId: string): Promise<FitAnalysis | null> {
    const result = await db.select().from(fitAnalyses).where(and(eq(fitAnalyses.userId, userId), eq(fitAnalyses.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      createdAt: a.createdAt.toISOString(),
    };
  }

  saveAnalysis(userId: string, analysis: FitAnalysis): FitAnalysis {
    throw new Error('Not implemented: requires async adaptation');
  }

  async saveAnalysisAsync(userId: string, analysis: FitAnalysis): Promise<FitAnalysis> {
    const existing = await this.getAnalysisForJobAsync(userId, analysis.jobId);
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
        createdAt: updated.createdAt.toISOString(),
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
        createdAt: inserted.createdAt.toISOString(),
      };
    }
  }
}
