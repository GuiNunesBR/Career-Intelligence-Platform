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
  getUserLake(userId: string): UserCareerLake {
    return db.getUserLake(userId);
  }

  saveUserLake(userId: string, lake: UserCareerLake): void {
    db.saveUserLake(userId, lake);
  }

  updateProfile(userId: string, updates: Partial<CareerProfile>): CareerProfile {
    return db.updateProfile(userId, updates);
  }

  addExperience(
    userId: string,
    exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Experience {
    return db.addExperience(userId, exp);
  }

  addProject(
    userId: string,
    proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Project {
    return db.addProject(userId, proj);
  }

  addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Skill {
    return db.addSkill(userId, skill);
  }

  addEvidence(
    userId: string,
    evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>
  ): Evidence {
    return db.addEvidence(userId, evidence);
  }

  getExperienceById(userId: string, id: string): Experience | null {
    const lake = this.getUserLake(userId);
    return lake.experiences.find((e) => e.id === id) || null;
  }

  getProjectById(userId: string, id: string): Project | null {
    const lake = this.getUserLake(userId);
    return lake.projects.find((p) => p.id === id) || null;
  }
}

export const careerLakeRepository = new CareerLakeRepository();
