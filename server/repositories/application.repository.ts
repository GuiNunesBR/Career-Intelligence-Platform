import { db } from '../db.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';
import { IApplicationRepository } from './interfaces.js';

export class ApplicationRepository implements IApplicationRepository {
  getApplications(userId: string): Application[] {
    return db.getApplications(userId);
  }

  getApplicationById(userId: string, id: string): Application | null {
    return db.getApplicationById(userId, id);
  }

  createApplication(
    userId: string,
    appData: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Application {
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

  updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Application | null {
    const app = this.getApplicationById(userId, id);
    if (!app) return null;

    const updated: Application = {
      ...app,
      status,
      updatedAt: new Date().toISOString(),
    };
    db.saveApplication(userId, updated);
    return updated;
  }

  deleteApplication(userId: string, id: string): boolean {
    return db.deleteApplication(userId, id);
  }
}

export const applicationRepository = new ApplicationRepository();
