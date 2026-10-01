import { eq, and } from 'drizzle-orm';
import { ITailoringRepository } from './interfaces.js';
import { TailoredCV, CoverLetter } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { tailoredCvs, coverLetters } from '../db/schema.js';

export class SqliteTailoringRepository implements ITailoringRepository {
  async getTailoredCVs(userId: string): Promise<TailoredCV[]> {
    const result = await db.select().from(tailoredCvs).where(eq(tailoredCvs.userId, userId));
    return result.map(c => ({
      ...c,
      mode: c.mode as TailoredCV['mode'],
      selectedExperiences: c.selectedExperiences as any,
      selectedSkills: c.selectedSkills as any,
      selectedProjects: c.selectedProjects as any,
      atsKeywordsMatched: c.atsKeywordsMatched as string[],
      honestyAuditNotes: c.honestyAuditNotes as string[],
      createdAt: c.createdAt,
    }));
  }

  async getTailoredCVForJob(userId: string, jobId: string): Promise<TailoredCV | null> {
    const result = await db.select().from(tailoredCvs).where(and(eq(tailoredCvs.userId, userId), eq(tailoredCvs.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const c = result[0];
    return {
      ...c,
      mode: c.mode as TailoredCV['mode'],
      selectedExperiences: c.selectedExperiences as any,
      selectedSkills: c.selectedSkills as any,
      selectedProjects: c.selectedProjects as any,
      atsKeywordsMatched: c.atsKeywordsMatched as string[],
      honestyAuditNotes: c.honestyAuditNotes as string[],
      createdAt: c.createdAt,
    };
  }

  async saveTailoredCV(userId: string, cv: TailoredCV): Promise<TailoredCV> {
    const existing = await this.getTailoredCVForJob(userId, cv.jobId);
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
      }).where(and(eq(tailoredCvs.userId, userId), eq(tailoredCvs.id, existing.id))).returning();
      
      return {
        ...updated,
        mode: updated.mode as TailoredCV['mode'],
        selectedExperiences: updated.selectedExperiences as any,
        selectedSkills: updated.selectedSkills as any,
        selectedProjects: updated.selectedProjects as any,
        atsKeywordsMatched: updated.atsKeywordsMatched as string[],
        honestyAuditNotes: updated.honestyAuditNotes as string[],
        createdAt: updated.createdAt,
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
        selectedExperiences: inserted.selectedExperiences as any,
        selectedSkills: inserted.selectedSkills as any,
        selectedProjects: inserted.selectedProjects as any,
        atsKeywordsMatched: inserted.atsKeywordsMatched as string[],
        honestyAuditNotes: inserted.honestyAuditNotes as string[],
        createdAt: inserted.createdAt,
      };
    }
  }

  async getCoverLetters(userId: string): Promise<CoverLetter[]> {
    const result = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
    return result.map(c => ({
      ...c,
      groundedFacts: c.groundedFacts as string[],
      createdAt: c.createdAt,
    }));
  }

  async getCoverLetterForJob(userId: string, jobId: string): Promise<CoverLetter | null> {
    const result = await db.select().from(coverLetters).where(and(eq(coverLetters.userId, userId), eq(coverLetters.jobId, jobId))).limit(1);
    if (result.length === 0) return null;
    const c = result[0];
    return {
      ...c,
      groundedFacts: c.groundedFacts as string[],
      createdAt: c.createdAt,
    };
  }

  async saveCoverLetter(userId: string, letter: CoverLetter): Promise<CoverLetter> {
    const existing = await this.getCoverLetterForJob(userId, letter.jobId);
    if (existing) {
      const [updated] = await db.update(coverLetters).set({
        recipient: letter.recipient,
        subject: letter.subject,
        content: letter.content,
        groundedFacts: letter.groundedFacts,
      }).where(and(eq(coverLetters.userId, userId), eq(coverLetters.id, existing.id))).returning();
      
      return {
        ...updated,
        groundedFacts: updated.groundedFacts as string[],
        createdAt: updated.createdAt,
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
        groundedFacts: inserted.groundedFacts as string[],
        createdAt: inserted.createdAt,
      };
    }
  }
}
