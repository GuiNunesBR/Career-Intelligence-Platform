import { ICareerLakeRepository } from '../repositories/interfaces.js';
import {
  UserCareerLake,
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
} from '../../src/shared/types.js';

export class CareerLakeService {
  constructor(private lakeRepo: ICareerLakeRepository) {}

  async getUserLake(userId: string): Promise<UserCareerLake> {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.getUserLake(userId);
  }

  async updateProfile(userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile> {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.updateProfile(userId, updates);
  }

  async addExperience(
    userId: string,
    exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Experience> {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.addExperience(userId, exp);
  }

  async addProject(
    userId: string,
    proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    if (!userId) throw new Error('User ID is required');
    if (proj.experienceId) {
      const exp = await this.lakeRepo.getExperienceById(userId, proj.experienceId);
      if (!exp) {
        throw new Error('Referenced experience does not exist for this user');
      }
    }
    return this.lakeRepo.addProject(userId, proj);
  }

  async addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Promise<Skill> {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.addSkill(userId, skill);
  }

  async addEvidence(
    userId: string,
    evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>
  ): Promise<Evidence> {
    if (!userId) throw new Error('User ID is required');
    if (evidence.experienceId) {
      const exp = await this.lakeRepo.getExperienceById(userId, evidence.experienceId);
      if (!exp) {
        throw new Error('Referenced experience does not exist for this user');
      }
    }
    if (evidence.projectId) {
      const proj = await this.lakeRepo.getProjectById(userId, evidence.projectId);
      if (!proj) {
        throw new Error('Referenced project does not exist for this user');
      }
    }
    return this.lakeRepo.addEvidence(userId, evidence);
  }
}
