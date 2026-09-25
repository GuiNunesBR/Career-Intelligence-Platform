import { db } from '../db.js';
import { TailoredCV, CoverLetter } from '../../src/shared/types.js';
import { ITailoringRepository } from './interfaces.js';

export class TailoringRepository implements ITailoringRepository {
  getTailoredCVs(userId: string): TailoredCV[] {
    return db.getCVs(userId);
  }

  getTailoredCVForJob(userId: string, jobId: string): TailoredCV | null {
    return db.getCVByJobId(userId, jobId);
  }

  saveTailoredCV(userId: string, cv: TailoredCV): TailoredCV {
    const scopedCV = { ...cv, userId };
    db.saveCV(userId, scopedCV);
    return scopedCV;
  }

  getCoverLetters(userId: string): CoverLetter[] {
    return db.getCoverLetters(userId);
  }

  getCoverLetterForJob(userId: string, jobId: string): CoverLetter | null {
    const letters = db.getCoverLetters(userId);
    return letters.find((l) => l.jobId === jobId && l.userId === userId) || null;
  }

  saveCoverLetter(userId: string, letter: CoverLetter): CoverLetter {
    const scopedLetter = { ...letter, userId };
    db.saveCoverLetter(userId, scopedLetter);
    return scopedLetter;
  }
}

export const tailoringRepository = new TailoringRepository();
