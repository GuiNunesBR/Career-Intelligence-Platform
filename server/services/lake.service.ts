import { careerLakeRepository, CareerLakeRepository } from '../repositories/lake.repository.js';
import {
  UserCareerLake,
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
} from '../../src/shared/types.js';

export class CareerLakeService {
  constructor(private lakeRepo: CareerLakeRepository = careerLakeRepository) {}

  getUserLake(userId: string): UserCareerLake {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.getUserLake(userId);
  }

  updateProfile(userId: string, updates: Partial<CareerProfile>): CareerProfile {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.updateProfile(userId, updates);
  }

  addExperience(
    userId: string,
    exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Experience {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.addExperience(userId, exp);
  }

  addProject(
    userId: string,
    proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Project {
    if (!userId) throw new Error('User ID is required');
    if (proj.experienceId) {
      const exp = this.lakeRepo.getExperienceById(userId, proj.experienceId);
      if (!exp) {
        throw new Error('Referenced experience does not exist for this user');
      }
    }
    return this.lakeRepo.addProject(userId, proj);
  }

  addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Skill {
    if (!userId) throw new Error('User ID is required');
    return this.lakeRepo.addSkill(userId, skill);
  }

  addEvidence(
    userId: string,
    evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>
  ): Evidence {
    if (!userId) throw new Error('User ID is required');
    if (evidence.experienceId) {
      const exp = this.lakeRepo.getExperienceById(userId, evidence.experienceId);
      if (!exp) {
        throw new Error('Referenced experience does not exist for this user');
      }
    }
    if (evidence.projectId) {
      const proj = this.lakeRepo.getProjectById(userId, evidence.projectId);
      if (!proj) {
        throw new Error('Referenced project does not exist for this user');
      }
    }
    return this.lakeRepo.addEvidence(userId, evidence);
  }
}

export const careerLakeService = new CareerLakeService();
