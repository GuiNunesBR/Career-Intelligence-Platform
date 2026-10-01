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
import { db } from '../db/index.js';
import {
  careerProfiles,
  experiences,
  projects,
  skills,
  evidences,
} from '../db/schema.js';

export class SqliteCareerLakeRepository implements ICareerLakeRepository {
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
        languages: (profileData[0].languages as CareerProfile['languages']) || [],
        education: (profileData[0].education as CareerProfile['education']) || [],
        createdAt: profileData[0].createdAt,
        updatedAt: profileData[0].updatedAt,
      } as CareerProfile : ({} as CareerProfile),
      experiences: exps.map(e => ({
        ...e,
        employmentType: e.employmentType as Experience['employmentType'],
        isCurrent: e.isCurrent ?? undefined,
        endDate: e.endDate || undefined,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      projects: projs.map(p => ({
        ...p,
        experienceId: p.experienceId || undefined,
        metrics: p.metrics || undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      skills: skls.map(s => ({
        ...s,
        category: s.category as Skill['category'],
        proficiency: s.proficiency as Skill['proficiency'],
      })),
      evidences: evids.map(e => ({
        ...e,
        type: e.type as Evidence['type'],
        confidence: e.confidence as Evidence['confidence'],
        experienceId: e.experienceId || undefined,
        projectId: e.projectId || undefined,
        metric: e.metric || undefined,
        domainTag: e.domainTag || undefined,
        createdAt: e.createdAt,
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
        languages: (updates.languages as any) || [],
        education: (updates.education as any) || [],
      }).returning();
      return {
        ...inserted,
        languages: inserted.languages as CareerProfile['languages'],
        education: inserted.education as CareerProfile['education'],
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      };
    } else {
      const [updated] = await db.update(careerProfiles).set({
        ...updates,
        languages: updates.languages ? (updates.languages as any) : undefined,
        education: updates.education ? (updates.education as any) : undefined,
        updatedAt: new Date().toISOString(), createdAt: undefined as any,
      }).where(eq(careerProfiles.userId, userId)).returning();
      return {
        ...updated,
        languages: updated.languages as CareerProfile['languages'],
        education: updated.education as CareerProfile['education'],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
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
      employmentType: inserted.employmentType as Experience['employmentType'],
      isCurrent: inserted.isCurrent ?? undefined,
      endDate: inserted.endDate || undefined,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
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
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
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
    return {
      ...inserted,
      category: inserted.category as Skill['category'],
      proficiency: inserted.proficiency as Skill['proficiency'],
    };
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
      type: inserted.type as Evidence['type'],
      confidence: inserted.confidence as Evidence['confidence'],
      experienceId: inserted.experienceId || undefined,
      projectId: inserted.projectId || undefined,
      metric: inserted.metric || undefined,
      domainTag: inserted.domainTag || undefined,
      createdAt: inserted.createdAt,
    };
  }

  async getExperienceById(userId: string, id: string): Promise<Experience | null> {
    const result = await db.select().from(experiences).where(and(eq(experiences.userId, userId), eq(experiences.id, id))).limit(1);
    if (result.length === 0) return null;
    const e = result[0];
    return {
      ...e,
      employmentType: e.employmentType as Experience['employmentType'],
      isCurrent: e.isCurrent ?? undefined,
      endDate: e.endDate || undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
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
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
