import { eq, and } from 'drizzle-orm';
import { IApplicationRepository } from './interfaces.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { applications } from '../db/schema.js';

export class SqliteApplicationRepository implements IApplicationRepository {
  async getApplications(userId: string): Promise<Application[]> {
    const result = await db.select().from(applications).where(eq(applications.userId, userId));
    return result.map(a => ({
      ...a,
      status: a.status as ApplicationStatus,
      timeline: a.timeline as any,
      appliedAt: a.appliedAt || undefined,
      cvVersionId: a.cvVersionId || undefined,
      coverLetterId: a.coverLetterId || undefined,
      salaryTarget: a.salaryTarget || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async getApplicationById(userId: string, id: string): Promise<Application | null> {
    const result = await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      status: a.status as ApplicationStatus,
      timeline: a.timeline as any,
      appliedAt: a.appliedAt || undefined,
      cvVersionId: a.cvVersionId || undefined,
      coverLetterId: a.coverLetterId || undefined,
      salaryTarget: a.salaryTarget || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  async createApplication(userId: string, app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    const id = `app_${Date.now()}`;
    const [inserted] = await db.insert(applications).values({
      id,
      userId,
      jobId: app.jobId,
      jobTitle: app.jobTitle,
      company: app.company,
      status: app.status,
      appliedAt: app.appliedAt || null,
      cvVersionId: app.cvVersionId,
      coverLetterId: app.coverLetterId,
      notes: app.notes,
      salaryTarget: app.salaryTarget,
      timeline: app.timeline,
    }).returning();
    
    return {
      ...inserted,
      status: inserted.status as ApplicationStatus,
      timeline: inserted.timeline as any,
      appliedAt: inserted.appliedAt || undefined,
      cvVersionId: inserted.cvVersionId || undefined,
      coverLetterId: inserted.coverLetterId || undefined,
      salaryTarget: inserted.salaryTarget || undefined,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    };
  }

  async updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Promise<Application | null> {
    const existing = await this.getApplicationById(userId, id);
    if (!existing) return null;

    const timeline = [...existing.timeline];
    timeline.push({
      status,
      timestamp: new Date().toISOString(),
      note: `Status automatically updated to ${status}`
    });

    const [updated] = await db.update(applications).set({
      status,
      timeline,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(applications.userId, userId), eq(applications.id, id))).returning();

    return {
      ...updated,
      status: updated.status as ApplicationStatus,
      timeline: updated.timeline as any,
      appliedAt: updated.appliedAt || undefined,
      cvVersionId: updated.cvVersionId || undefined,
      coverLetterId: updated.coverLetterId || undefined,
      salaryTarget: updated.salaryTarget || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteApplication(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).returning({ id: applications.id });
    return result.length > 0;
  }
}
