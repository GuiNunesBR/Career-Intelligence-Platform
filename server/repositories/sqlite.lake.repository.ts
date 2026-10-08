import { eq, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ICareerLakeRepository, ResumeImportResult } from './interfaces.js';
import {
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
  UserCareerLake,
  RecordOrigin,
} from '../../src/shared/types.js';
import { normalizeForMatch } from '../../src/shared/text.js';
import { db } from '../db/index.js';
import {
  careerProfiles,
  experiences,
  projects,
  skills,
  evidences,
} from '../db/schema.js';
import { CV_EVIDENCE_SOURCE, ResumeImportPayload, ImportedEvidence } from '../services/resume-import.service.js';

// Date.now() alone collides when several rows are inserted in the same millisecond
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const experienceKey = (e: { company: string; title: string; startDate: string }) =>
  `${normalizeForMatch(e.company)}|${normalizeForMatch(e.title)}|${(e.startDate || '').slice(0, 7)}`;

function toExperience(e: typeof experiences.$inferSelect): Experience {
  return {
    ...e,
    employmentType: e.employmentType as Experience['employmentType'],
    isCurrent: e.isCurrent ?? undefined,
    endDate: e.endDate || undefined,
    origin: (e.origin as RecordOrigin) || undefined,
  };
}

function toProject(p: typeof projects.$inferSelect): Project {
  return {
    ...p,
    experienceId: p.experienceId || undefined,
    metrics: p.metrics || undefined,
    origin: (p.origin as RecordOrigin) || undefined,
  };
}

function toSkill(s: typeof skills.$inferSelect): Skill {
  return {
    ...s,
    category: s.category as Skill['category'],
    proficiency: s.proficiency as Skill['proficiency'],
    origin: (s.origin as RecordOrigin) || undefined,
  };
}

function toEvidence(e: typeof evidences.$inferSelect): Evidence {
  return {
    ...e,
    type: e.type as Evidence['type'],
    confidence: e.confidence as Evidence['confidence'],
    experienceId: e.experienceId || undefined,
    projectId: e.projectId || undefined,
    metric: e.metric || undefined,
    domainTag: e.domainTag || undefined,
    tools: e.tools || undefined,
  };
}

function toProfile(p: typeof careerProfiles.$inferSelect): CareerProfile {
  return {
    ...p,
    languages: (p.languages as CareerProfile['languages']) || [],
    education: (p.education as CareerProfile['education']) || [],
    contact: (p.contact as CareerProfile['contact']) || undefined,
    certifications: (p.certifications as CareerProfile['certifications']) || undefined,
  };
}

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
      profile: profileData.length > 0 ? toProfile(profileData[0]) : ({} as CareerProfile),
      experiences: exps.map(toExperience),
      projects: projs.map(toProject),
      skills: skls.map(toSkill),
      evidences: evids.map(toEvidence),
    };
  }

  async saveUserLake(_userId: string, _lake: UserCareerLake): Promise<void> {
    // Full lake replacement is not used in the PostgreSQL approach;
    // individual entity operations are preferred.
    throw new Error('saveUserLake is not supported in PostgreSQL mode. Use individual entity operations.');
  }

  async updateProfile(userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile> {
    return upsertProfile(db, userId, updates);
  }

  async addExperience(userId: string, exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Experience> {
    const [inserted] = await db.insert(experiences).values({
      id: newId('exp'),
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
      origin: exp.origin || 'manual',
    }).returning();
    return toExperience(inserted);
  }

  async addProject(userId: string, proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const [inserted] = await db.insert(projects).values({
      id: newId('proj'),
      userId,
      experienceId: proj.experienceId,
      name: proj.name,
      description: proj.description,
      domain: proj.domain,
      scope: proj.scope,
      technologies: proj.technologies,
      metrics: proj.metrics,
      origin: proj.origin || 'manual',
    }).returning();
    return toProject(inserted);
  }

  async addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Promise<Skill> {
    const [inserted] = await db.insert(skills).values({
      id: newId('skill'),
      userId,
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsExperience: skill.yearsExperience,
      origin: skill.origin || 'manual',
    }).returning();
    return toSkill(inserted);
  }

  async addEvidence(userId: string, evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>): Promise<Evidence> {
    const [inserted] = await db.insert(evidences).values({
      id: newId('evid'),
      userId,
      experienceId: evidence.experienceId,
      projectId: evidence.projectId,
      type: evidence.type,
      statement: evidence.statement,
      metric: evidence.metric,
      source: evidence.source,
      confidence: evidence.confidence,
      domainTag: evidence.domainTag,
      tools: evidence.tools,
    }).returning();
    return toEvidence(inserted);
  }

  async getExperienceById(userId: string, id: string): Promise<Experience | null> {
    const result = await db.select().from(experiences).where(and(eq(experiences.userId, userId), eq(experiences.id, id))).limit(1);
    return result.length ? toExperience(result[0]) : null;
  }

  async getProjectById(userId: string, id: string): Promise<Project | null> {
    const result = await db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.id, id))).limit(1);
    return result.length ? toProject(result[0]) : null;
  }

  async deleteExperience(userId: string, id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      // Evidences describe the experience and go with it; projects survive, unlinked
      await tx.delete(evidences).where(and(eq(evidences.userId, userId), eq(evidences.experienceId, id)));
      await tx.update(projects).set({ experienceId: null }).where(and(eq(projects.userId, userId), eq(projects.experienceId, id)));
      const deleted = await tx.delete(experiences).where(and(eq(experiences.userId, userId), eq(experiences.id, id))).returning({ id: experiences.id });
      return deleted.length > 0;
    });
  }

  async deleteProject(userId: string, id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.delete(evidences).where(and(eq(evidences.userId, userId), eq(evidences.projectId, id)));
      const deleted = await tx.delete(projects).where(and(eq(projects.userId, userId), eq(projects.id, id))).returning({ id: projects.id });
      return deleted.length > 0;
    });
  }

  async deleteSkill(userId: string, id: string): Promise<boolean> {
    const deleted = await db.delete(skills).where(and(eq(skills.userId, userId), eq(skills.id, id))).returning({ id: skills.id });
    return deleted.length > 0;
  }

  async deleteEvidence(userId: string, id: string): Promise<boolean> {
    const deleted = await db.delete(evidences).where(and(eq(evidences.userId, userId), eq(evidences.id, id))).returning({ id: evidences.id });
    return deleted.length > 0;
  }

  /**
   * Merges a CV import into the Lake: records that match an existing one (same company + title +
   * start month, same project/skill name) are updated in place and keep their ids; CV evidences of
   * matched records are replaced; CV-imported records missing from the new CV are removed unless the
   * user attached their own evidence to them. Manually added records are never removed.
   */
  async importResume(userId: string, payload: ResumeImportPayload): Promise<ResumeImportResult> {
    const result: ResumeImportResult = { created: 0, updated: 0, removed: 0, keptWithManualEvidence: [] };

    await db.transaction(async (tx) => {
      await upsertProfile(tx, userId, payload.profile);

      const insertEvidences = async (list: ImportedEvidence[], link: { experienceId?: string; projectId?: string }) => {
        if (!list.length) return;
        await tx.insert(evidences).values(
          list.map((ev) => ({
            id: newId('evid'),
            userId,
            ...link,
            type: ev.type,
            statement: ev.statement,
            metric: ev.metric,
            source: ev.source,
            confidence: ev.confidence,
            domainTag: ev.domainTag,
            tools: ev.tools,
          }))
        );
      };
      const userEvidences = await tx.select().from(evidences).where(eq(evidences.userId, userId));
      const hasManualEvidence = (field: 'experienceId' | 'projectId', id: string) =>
        userEvidences.some((ev) => ev[field] === id && ev.source !== CV_EVIDENCE_SOURCE);
      const deleteCvEvidences = (field: 'experienceId' | 'projectId', id: string) =>
        tx.delete(evidences).where(
          and(eq(evidences.userId, userId), eq(evidences[field], id), eq(evidences.source, CV_EVIDENCE_SOURCE))
        );

      // --- Experiences ---
      const existingExps = await tx.select().from(experiences).where(eq(experiences.userId, userId));
      const matchedExpIds = new Set<string>();
      const expIds: string[] = [];
      for (const { data, evidences: evs } of payload.experiences) {
        const match = existingExps.find((e) => !matchedExpIds.has(e.id) && experienceKey(e) === experienceKey(data));
        let expId: string;
        if (match) {
          expId = match.id;
          await tx.update(experiences).set({
            ...data,
            endDate: data.endDate ?? null,
            origin: match.origin === 'manual' ? 'manual' : 'cv',
            updatedAt: new Date().toISOString(),
          }).where(eq(experiences.id, expId));
          await deleteCvEvidences('experienceId', expId);
          result.updated++;
        } else {
          expId = newId('exp');
          await tx.insert(experiences).values({ id: expId, userId, ...data, origin: 'cv' });
          result.created++;
        }
        matchedExpIds.add(expId);
        expIds.push(expId);
        await insertEvidences(evs, { experienceId: expId });
      }

      // --- Projects ---
      const existingProjs = await tx.select().from(projects).where(eq(projects.userId, userId));
      const matchedProjIds = new Set<string>();
      for (const { data, experienceIndex, evidences: evs } of payload.projects) {
        const experienceId = experienceIndex !== undefined ? expIds[experienceIndex] : null;
        const match = existingProjs.find((p) => !matchedProjIds.has(p.id) && normalizeForMatch(p.name) === normalizeForMatch(data.name));
        let projId: string;
        if (match) {
          projId = match.id;
          await tx.update(projects).set({
            ...data,
            experienceId,
            origin: match.origin === 'manual' ? 'manual' : 'cv',
            updatedAt: new Date().toISOString(),
          }).where(eq(projects.id, projId));
          await deleteCvEvidences('projectId', projId);
          result.updated++;
        } else {
          projId = newId('proj');
          await tx.insert(projects).values({ id: projId, userId, ...data, experienceId, origin: 'cv' });
          result.created++;
        }
        matchedProjIds.add(projId);
        await insertEvidences(evs, { projectId: projId });
      }

      // --- Skills ---
      const existingSkills = await tx.select().from(skills).where(eq(skills.userId, userId));
      const matchedSkillIds = new Set<string>();
      for (const skill of payload.skills) {
        const match = existingSkills.find((s) => normalizeForMatch(s.name) === normalizeForMatch(skill.name));
        if (match) {
          matchedSkillIds.add(match.id);
          // The user's own classification of a manual skill wins over the CV parser
          if (match.origin !== 'manual') {
            await tx.update(skills).set({ ...skill, origin: 'cv' }).where(eq(skills.id, match.id));
            result.updated++;
          }
        } else {
          const id = newId('skill');
          await tx.insert(skills).values({ id, userId, ...skill, origin: 'cv' });
          matchedSkillIds.add(id);
          result.created++;
        }
      }

      // --- Remove CV-imported records that are no longer in the CV ---
      for (const exp of existingExps.filter((e) => e.origin === 'cv' && !matchedExpIds.has(e.id))) {
        if (hasManualEvidence('experienceId', exp.id)) {
          result.keptWithManualEvidence.push(`${exp.title} — ${exp.company}`);
          continue;
        }
        await deleteCvEvidences('experienceId', exp.id);
        await tx.update(projects).set({ experienceId: null }).where(and(eq(projects.userId, userId), eq(projects.experienceId, exp.id)));
        await tx.delete(experiences).where(eq(experiences.id, exp.id));
        result.removed++;
      }
      for (const proj of existingProjs.filter((p) => p.origin === 'cv' && !matchedProjIds.has(p.id))) {
        if (hasManualEvidence('projectId', proj.id)) {
          result.keptWithManualEvidence.push(proj.name);
          continue;
        }
        await deleteCvEvidences('projectId', proj.id);
        await tx.delete(projects).where(eq(projects.id, proj.id));
        result.removed++;
      }
      const staleSkills = existingSkills.filter((s) => s.origin === 'cv' && !matchedSkillIds.has(s.id)).map((s) => s.id);
      if (staleSkills.length) {
        await tx.delete(skills).where(inArray(skills.id, staleSkills));
        result.removed += staleSkills.length;
      }
    });

    return result;
  }
}

async function upsertProfile(conn: typeof db | Tx, userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile> {
  const existing = await conn.select().from(careerProfiles).where(eq(careerProfiles.userId, userId)).limit(1);
  if (existing.length === 0) {
    const [inserted] = await conn.insert(careerProfiles).values({
      id: newId('prof'),
      userId,
      headline: updates.headline || '',
      summary: updates.summary || '',
      location: updates.location || '',
      targetRoles: updates.targetRoles || [],
      targetIndustries: updates.targetIndustries || [],
      languages: (updates.languages as any) || [],
      education: (updates.education as any) || [],
      contact: (updates.contact as any) ?? null,
      certifications: updates.certifications ?? null,
    }).returning();
    return toProfile(inserted);
  }
  const { id: _id, userId: _userId, createdAt: _createdAt, ...fields } = updates;
  const [updated] = await conn.update(careerProfiles).set({
    ...fields,
    languages: updates.languages ? (updates.languages as any) : undefined,
    education: updates.education ? (updates.education as any) : undefined,
    contact: updates.contact ? (updates.contact as any) : undefined,
    updatedAt: new Date().toISOString(),
  }).where(eq(careerProfiles.userId, userId)).returning();
  return toProfile(updated);
}
