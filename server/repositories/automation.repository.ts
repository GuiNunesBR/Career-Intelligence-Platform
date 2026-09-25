import { db } from '../db.js';
import { UserAutomation } from '../../src/shared/types.js';
import { IAutomationRepository } from './interfaces.js';

export class AutomationRepository implements IAutomationRepository {
  getAutomations(userId: string): UserAutomation[] {
    return db.getAutomations(userId);
  }

  getAutomationById(userId: string, id: string): UserAutomation | null {
    return db.getAutomationById(userId, id);
  }

  saveAutomation(userId: string, automation: UserAutomation): UserAutomation {
    const scopedAutomation = { ...automation, userId };
    db.saveAutomation(userId, scopedAutomation);
    return scopedAutomation;
  }

  deleteAutomation(userId: string, id: string): boolean {
    return db.deleteAutomation(userId, id);
  }

  getAllActiveAutomations(): UserAutomation[] {
    return db.getAllActiveAutomations();
  }
}

export const automationRepository = new AutomationRepository();
