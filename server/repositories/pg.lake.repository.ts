import { eq, and } from 'drizzle-orm';
import { ICareerLakeRepository } from './interfaces.js';
import {
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
  UserCareerLake,
} from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import {
  careerProfiles,
  experiences,
  projects,
  skills,
  evidences,
} from '../db/schema.js';

export class PgCareerLakeRepository implements ICareerLakeRepository {
  async getUserLake(userId: string): Promise<UserCareerLake> {
    const [profileData, exps, projs, skls, evids] = await Promise.all([
      db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId)).limit(1),
      db.select().from(experiences).where(eq(experiences.userId, userId)),
      db.select().from(projects).where(eq(projects.userId, userId)),
      db.select().from(skills).where(eq(skills.userId, userId)),
      db.select().from(evidences).where(eq(evidences.userId, userId)),
    ]);

    return {
      profile: profileData.length > 0 ? {
        id: profileData[0].id,
        userId: profileData[0].userId,
        headline: profileData[0].headline,
        summary: profileData[0].summary,
        location: profileData[0].location,
        targetRoles: profileData[0].targetRoles,
        targetIndustries: profileData[0].targetIndustries,
        languages: profileData[0].languages,
        education: profileData[0].education,
        createdAt: profileData[0].createdAt.toISOString(),
        updatedAt: profileData[0].updatedAt.toISOString(),
      } : null,
      experiences: exps.map(e => ({
        ...e,
        isCurrent: e.isCurrent ?? undefined,
        endDate: e.endDate || undefined,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      projects: projs.map(p => ({
        ...p,
        experienceId: p.experienceId || undefined,
        metrics: p.metrics || undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      skills: skls.map(s => ({
        ...s,
      })),
      evidences: evids.map(e => ({
        ...e,
        experienceId: e.experienceId || undefined,
        projectId: e.projectId || undefined,
        metric: e.metric || undefined,
        domainTag: e.domainTag || undefined,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async saveUserLake(_userId: string, _lake: UserCareerLake): Promise<void> {
    // Full lake replacement is not used in the PostgreSQL approach;
    // individual entity operations are preferred.
    throw new Error('saveUserLake is not supported in PostgreSQL mode. Use individual entity operations.');
  }

  async updateProfile(userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile> {
    const existing = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId)).limit(1);
    if (existing.length === 0) {
      const id = `prof_${Date.now()}`;
      const [inserted] = await db.insert(careerProfiles).values({
        id,
        userId,
        headline: updates.headline || '',
        summary: updates.summary || '',
        location: updates.location || '',
        targetRoles: updates.targetRoles || [],
        targetIndustries: updates.targetIndustries || [],
        languages: updates.languages || [],
        education: updates.education || [],
      }).returning();
      return {
        ...inserted,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    } else {
      const [updated] = await db.update(careerProfiles).set({
        ...updates,
        updatedAt: new Date(),
      }).where(eq(careerProfiles.userId, userId)).returning();
      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }
  }

  async addExperience(userId: string, exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Experience> {
    const id = `exp_${Date.now()}`;
    const [inserted] = await db.insert(experiences).values({
      id,
      userId,
      company: exp.company,
      title: exp.title,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      employmentType: exp.employmentType,
      domain: exp.domain,
      location: exp.location,
      description: exp.description,
    }).returning();
    return {
      ...inserted,
      isCurrent: inserted.isCurrent ?? undefined,
      endDate: inserted.endDate || undefined,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async addProject(userId: string, proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = `proj_${Date.now()}`;
    const [inserted] = await db.insert(projects).values({
      id,
      userId,
      experienceId: proj.experienceId,
      name: proj.name,
      description: proj.description,
      domain: proj.domain,
      scope: proj.scope,
      technologies: proj.technologies,
      metrics: proj.metrics,
    }).returning();
    return {
      ...inserted,
      experienceId: inserted.experienceId || undefined,
      metrics: inserted.metrics || undefined,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  async addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Promise<Skill> {
    const id = `skill_${Date.now()}`;
    const [inserted] = await db.insert(skills).values({
      id,
      userId,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsExperience: skill.yearsExperience,
    }).returning();
    return inserted;
  }

  async addEvidence(userId: string, evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>): Promise<Evidence> {
    const id = `evid_${Date.now()}`;
    const [inserted] = await db.insert(evidences).values({
      id,
      userId,
      experienceId: evidence.experienceId,
      projectId: evidence.projectId,
      type: evidence.type,
      statement: evidence.statement,
      metric: evidence.metric,
      source: evidence.source,
      confidence: evidence.confidence,
      domainTag: evidence.domainTag,
    }).returning();
    return {
      ...inserted,
      experienceId: inserted.experienceId || undefined,
      projectId: inserted.projectId || undefined,
      metric: inserted.metric || undefined,
      domainTag: inserted.domainTag || undefined,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async getExperienceById(userId: string, id: string): Promise<Experience | null> {
    const result = await db.select().from(experiences).where(and(eq(experiences.userId, userId), eq(experiences.id, id))).limit(1);
    if (result.length === 0) return null;
    const e = result[0];
    return {
      ...e,
      isCurrent: e.isCurrent ?? undefined,
      endDate: e.endDate || undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  async getProjectById(userId: string, id: string): Promise<Project | null> {
    const result = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.id, id))).limit(1);
    if (result.length === 0) return null;
    const p = result[0];
    return {
      ...p,
      experienceId: p.experienceId || undefined,
      metrics: p.metrics || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
