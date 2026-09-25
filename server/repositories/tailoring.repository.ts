import { db } from '../db.js';
import { TailoredCV, CoverLetter } from '../../src/shared/types.js';
import { ITailoringRepository } from './interfaces.js';

export class TailoringRepository implements ITailoringRepository {
  async getTailoredCVs(userId: string): Promise<TailoredCV[]> {
    return db.getCVs(userId);
  }

  async getTailoredCVForJob(userId: string, jobId: string): Promise<TailoredCV | null> {
    return db.getCVByJobId(userId, jobId);
  }

  async saveTailoredCV(userId: string, cv: TailoredCV): Promise<TailoredCV> {
    const scopedCV = { ...cv, userId };
    db.saveCV(userId, scopedCV);
    return scopedCV;
  }

  async getCoverLetters(userId: string): Promise<CoverLetter[]> {
    return db.getCoverLetters(userId);
  }

  async getCoverLetterForJob(userId: string, jobId: string): Promise<CoverLetter | null> {
    const letters = db.getCoverLetters(userId);
    return letters.find((l) => l.jobId === jobId && l.userId === userId) || null;
  }

  async saveCoverLetter(userId: string, letter: CoverLetter): Promise<CoverLetter> {
    const scopedLetter = { ...letter, userId };
    db.saveCoverLetter(userId, scopedLetter);
    return scopedLetter;
  }
}

export const tailoringRepository = new TailoringRepository();
