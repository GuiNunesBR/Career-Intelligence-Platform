import { eq, and } from 'drizzle-orm';
import { IApplicationRepository } from './interfaces.js';
import { Application, ApplicationStatus } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { applications } from '../db/schema.js';

export class PgApplicationRepository implements IApplicationRepository {
  getApplications(userId: string): Application[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getApplicationsAsync(userId: string): Promise<Application[]> {
    const result = await db.select().from(applications).where(eq(applications.userId, userId));
    return result.map(a => ({
      ...a,
      status: a.status as ApplicationStatus,
      appliedAt: a.appliedAt?.toISOString(),
      cvVersionId: a.cvVersionId || undefined,
      coverLetterId: a.coverLetterId || undefined,
      salaryTarget: a.salaryTarget || undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  getApplicationById(userId: string, id: string): Application | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getApplicationByIdAsync(userId: string, id: string): Promise<Application | null> {
    const result = await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      status: a.status as ApplicationStatus,
      appliedAt: a.appliedAt?.toISOString(),
      cvVersionId: a.cvVersionId || undefined,
      coverLetterId: a.coverLetterId || undefined,
      salaryTarget: a.salaryTarget || undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  createApplication(userId: string, app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Application {
    throw new Error('Not implemented: requires async adaptation');
  }

  async createApplicationAsync(userId: string, app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    const id = `app_${Date.now()}`;
    const [inserted] = await db.insert(applications).values({
      id,
      userId,
      jobId: app.jobId,
      jobTitle: app.jobTitle,
      company: app.company,
      status: app.status,
      appliedAt: app.appliedAt ? new Date(app.appliedAt) : null,
      cvVersionId: app.cvVersionId,
      coverLetterId: app.coverLetterId,
      notes: app.notes,
      salaryTarget: app.salaryTarget,
      timeline: app.timeline,
    }).returning();
    
    return {
      ...inserted,
      status: inserted.status as ApplicationStatus,
      appliedAt: inserted.appliedAt?.toISOString(),
      cvVersionId: inserted.cvVersionId || undefined,
      coverLetterId: inserted.coverLetterId || undefined,
      salaryTarget: inserted.salaryTarget || undefined,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  }

  updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Application | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async updateApplicationStatusAsync(userId: string, id: string, status: ApplicationStatus): Promise<Application | null> {
    const existing = await this.getApplicationByIdAsync(userId, id);
    if (!existing) return null;

    const timeline = [...existing.timeline];
    timeline.push({
      status,
      date: new Date().toISOString(),
      note: `Status automatically updated to ${status}`
    });

    const [updated] = await db.update(applications).set({
      status,
      timeline,
      updatedAt: new Date(),
    }).where(and(eq(applications.userId, userId), eq(applications.id, id))).returning();

    return {
      ...updated,
      status: updated.status as ApplicationStatus,
      appliedAt: updated.appliedAt?.toISOString(),
      cvVersionId: updated.cvVersionId || undefined,
      coverLetterId: updated.coverLetterId || undefined,
      salaryTarget: updated.salaryTarget || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  deleteApplication(userId: string, id: string): boolean {
    throw new Error('Not implemented: requires async adaptation');
  }

  async deleteApplicationAsync(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(applications).where(and(eq(applications.userId, userId), eq(applications.id, id))).returning({ id: applications.id });
    return result.length > 0;
  }
}
