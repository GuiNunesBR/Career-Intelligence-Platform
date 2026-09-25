import { db } from '../db.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';
import { IApplicationRepository } from './interfaces.js';

export class ApplicationRepository implements IApplicationRepository {
  async getApplications(userId: string): Promise<Application[]> {
    return db.getApplications(userId);
  }

  async getApplicationById(userId: string, id: string): Promise<Application | null> {
    return db.getApplicationById(userId, id);
  }

  async createApplication(
    userId: string,
    appData: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Application> {
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const app: Application = {
      ...appData,
      id,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    db.saveApplication(userId, app);
    return app;
  }

  async updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Promise<Application | null> {
    const app = await this.getApplicationById(userId, id);
    if (!app) return null;

    const updated: Application = {
      ...app,
      status,
      updatedAt: new Date().toISOString(),
    };
    db.saveApplication(userId, updated);
    return updated;
  }

  async deleteApplication(userId: string, id: string): Promise<boolean> {
    return db.deleteApplication(userId, id);
  }
}

export const applicationRepository = new ApplicationRepository();
