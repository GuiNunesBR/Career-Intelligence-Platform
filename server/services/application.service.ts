import { applicationRepository, ApplicationRepository } from '../repositories/application.repository.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';

export class ApplicationService {
  constructor(private appRepo: ApplicationRepository = applicationRepository) {}

  getApplications(userId: string): Application[] {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.getApplications(userId);
  }

  getApplicationById(userId: string, id: string): Application | null {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.getApplicationById(userId, id);
  }

  createApplication(
    userId: string,
    data: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Application {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.createApplication(userId, data);
  }

  updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Application {
    if (!userId) throw new Error('User ID is required');
    const updated = this.appRepo.updateApplicationStatus(userId, id, status);
    if (!updated) {
      throw new Error(`Application not found or unauthorized: ${id}`);
    }
    return updated;
  }

  deleteApplication(userId: string, id: string): boolean {
    if (!userId) throw new Error('User ID is required');
    const deleted = this.appRepo.deleteApplication(userId, id);
    if (!deleted) {
      throw new Error(`Application not found or unauthorized: ${id}`);
    }
    return true;
  }
}

export const applicationService = new ApplicationService();
