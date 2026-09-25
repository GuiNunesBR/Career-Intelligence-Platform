import { db } from '../db.js';
import {
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
  UserCareerLake,
} from '../../src/shared/types.js';
import { ICareerLakeRepository } from './interfaces.js';

export class CareerLakeRepository implements ICareerLakeRepository {
  async getUserLake(userId: string): Promise<UserCareerLake> {
    return db.getUserLake(userId);
  }

  async saveUserLake(userId: string, lake: UserCareerLake): Promise<void> {
    db.saveUserLake(userId, lake);
  }

  async updateProfile(userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile> {
    return db.updateProfile(userId, updates);
  }

  async addExperience(
    userId: string,
    exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Experience> {
    return db.addExperience(userId, exp);
  }

  async addProject(
    userId: string,
    proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    return db.addProject(userId, proj);
  }

  async addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Promise<Skill> {
    return db.addSkill(userId, skill);
  }

  async addEvidence(
    userId: string,
    evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>
  ): Promise<Evidence> {
    return db.addEvidence(userId, evidence);
  }

  async getExperienceById(userId: string, id: string): Promise<Experience | null> {
    const lake = await this.getUserLake(userId);
    return lake.experiences.find((e) => e.id === id) || null;
  }

  async getProjectById(userId: string, id: string): Promise<Project | null> {
    const lake = await this.getUserLake(userId);
    return lake.projects.find((p) => p.id === id) || null;
  }
}

export const careerLakeRepository = new CareerLakeRepository();
