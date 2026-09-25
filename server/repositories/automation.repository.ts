import { db } from '../db.js';
import { UserAutomation } from '../../src/shared/types.js';
import { IAutomationRepository } from './interfaces.js';

export class AutomationRepository implements IAutomationRepository {
  async getAutomations(userId: string): Promise<UserAutomation[]> {
    return db.getAutomations(userId);
  }

  async getAutomationById(userId: string, id: string): Promise<UserAutomation | null> {
    return db.getAutomationById(userId, id);
  }

  async saveAutomation(userId: string, automation: UserAutomation): Promise<UserAutomation> {
    const scopedAutomation = { ...automation, userId };
    db.saveAutomation(userId, scopedAutomation);
    return scopedAutomation;
  }

  async deleteAutomation(userId: string, id: string): Promise<boolean> {
    return db.deleteAutomation(userId, id);
  }

  async getAllActiveAutomations(): Promise<UserAutomation[]> {
    return db.getAllActiveAutomations();
  }
}

export const automationRepository = new AutomationRepository();
