import { IApplicationRepository } from '../repositories/interfaces.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';

export class ApplicationService {
  constructor(private appRepo: IApplicationRepository) {}

  async getApplications(userId: string): Promise<Application[]> {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.getApplications(userId);
  }

  async getApplicationById(userId: string, id: string): Promise<Application | null> {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.getApplicationById(userId, id);
  }

  async createApplication(
    userId: string,
    data: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Application> {
    if (!userId) throw new Error('User ID is required');
    return this.appRepo.createApplication(userId, data);
  }

  async updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Promise<Application> {
    if (!userId) throw new Error('User ID is required');
    const updated = await this.appRepo.updateApplicationStatus(userId, id, status);
    if (!updated) {
      throw new Error(`Application not found or unauthorized: ${id}`);
    }
    return updated;
  }

  async deleteApplication(userId: string, id: string): Promise<boolean> {
    if (!userId) throw new Error('User ID is required');
    const deleted = await this.appRepo.deleteApplication(userId, id);
    if (!deleted) {
      throw new Error(`Application not found or unauthorized: ${id}`);
    }
    return true;
  }
}
