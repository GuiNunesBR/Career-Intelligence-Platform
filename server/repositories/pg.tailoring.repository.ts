import { eq, and } from 'drizzle-orm';
import { ITailoringRepository } from './interfaces.js';
import { TailoredCV, CoverLetter } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { tailoredCvs, coverLetters } from '../db/schema.js';

export class PgTailoringRepository implements ITailoringRepository {
  getTailoredCVs(userId: string): TailoredCV[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getTailoredCVsAsync(userId: string): Promise<TailoredCV[]> {
    const result = await db.select().from(tailoredCvs).where(eq(tailoredCvs.userId, userId));
    return result.map(c => ({
      ...c,
      mode: c.mode as TailoredCV['mode'],
      createdAt: c.createdAt.toISOString(),
    }));
  }

  getTailoredCVForJob(userId: string, jobId: string): TailoredCV | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getTailoredCVForJobAsync(userId: string, jobId: string): Promise<TailoredCV | null> {
    const result = await db.select().from(tailoredCvs).where(and(eq(tailoredCvs.userId, userId), eq(tailoredCvs.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const c = result[0];
    return {
      ...c,
      mode: c.mode as TailoredCV['mode'],
      createdAt: c.createdAt.toISOString(),
    };
  }

  saveTailoredCV(userId: string, cv: TailoredCV): TailoredCV {
    throw new Error('Not implemented: requires async adaptation');
  }

  async saveTailoredCVAsync(userId: string, cv: TailoredCV): Promise<TailoredCV> {
    const existing = await this.getTailoredCVForJobAsync(userId, cv.jobId);
    if (existing) {
      const [updated] = await db.update(tailoredCvs).set({
        mode: cv.mode,
        headline: cv.headline,
        summary: cv.summary,
        selectedExperiences: cv.selectedExperiences,
        selectedSkills: cv.selectedSkills,
        selectedProjects: cv.selectedProjects,
        atsKeywordsMatched: cv.atsKeywordsMatched,
        honestyAuditNotes: cv.honestyAuditNotes,
      }).where(and(eq(tailoredCvs.userId, userId), eq(tailoredCvs.id, cv.id))).returning();
      
      return {
        ...updated,
        mode: updated.mode as TailoredCV['mode'],
        createdAt: updated.createdAt.toISOString(),
      };
    } else {
      const [inserted] = await db.insert(tailoredCvs).values({
        id: cv.id,
        userId,
        jobId: cv.jobId,
        mode: cv.mode,
        headline: cv.headline,
        summary: cv.summary,
        selectedExperiences: cv.selectedExperiences,
        selectedSkills: cv.selectedSkills,
        selectedProjects: cv.selectedProjects,
        atsKeywordsMatched: cv.atsKeywordsMatched,
        honestyAuditNotes: cv.honestyAuditNotes,
      }).returning();
      
      return {
        ...inserted,
        mode: inserted.mode as TailoredCV['mode'],
        createdAt: inserted.createdAt.toISOString(),
      };
    }
  }

  getCoverLetters(userId: string): CoverLetter[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getCoverLettersAsync(userId: string): Promise<CoverLetter[]> {
    const result = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
    return result.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  getCoverLetterForJob(userId: string, jobId: string): CoverLetter | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getCoverLetterForJobAsync(userId: string, jobId: string): Promise<CoverLetter | null> {
    const result = await db.select().from(coverLetters).where(and(eq(coverLetters.userId, userId), eq(coverLetters.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const c = result[0];
    return {
      ...c,
      createdAt: c.createdAt.toISOString(),
    };
  }

  saveCoverLetter(userId: string, letter: CoverLetter): CoverLetter {
    throw new Error('Not implemented: requires async adaptation');
  }

  async saveCoverLetterAsync(userId: string, letter: CoverLetter): Promise<CoverLetter> {
    const existing = await this.getCoverLetterForJobAsync(userId, letter.jobId);
    if (existing) {
      const [updated] = await db.update(coverLetters).set({
        recipient: letter.recipient,
        subject: letter.subject,
        content: letter.content,
        groundedFacts: letter.groundedFacts,
      }).where(and(eq(coverLetters.userId, userId), eq(coverLetters.id, letter.id))).returning();
      
      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      };
    } else {
      const [inserted] = await db.insert(coverLetters).values({
        id: letter.id,
        userId,
        jobId: letter.jobId,
        recipient: letter.recipient,
        subject: letter.subject,
        content: letter.content,
        groundedFacts: letter.groundedFacts,
      }).returning();
      
      return {
        ...inserted,
        createdAt: inserted.createdAt.toISOString(),
      };
    }
  }
}
