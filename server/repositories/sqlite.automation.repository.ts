import { eq, and } from 'drizzle-orm';
import { IAutomationRepository } from './interfaces.js';
import { UserAutomation, AutomationType, AutomationSchedule } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { userAutomations, backgroundJobs } from '../db/schema.js';

export class SqliteAutomationRepository implements IAutomationRepository {
  async getAutomations(userId: string): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.userId, userId));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      enabled: a.enabled === 1,
      schedule: (typeof a.schedule === 'string' ? JSON.parse(a.schedule) : a.schedule) as AutomationSchedule,
      nextRunAt: a.nextRunAt,
      lastRunAt: a.lastRunAt || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async getAutomationById(userId: string, id: string): Promise<UserAutomation | null> {
    const result = await db.select().from(userAutomations).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, id))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      type: a.type as AutomationType,
      enabled: a.enabled === 1,
      schedule: (typeof a.schedule === 'string' ? JSON.parse(a.schedule) : a.schedule) as AutomationSchedule,
      nextRunAt: a.nextRunAt,
      lastRunAt: a.lastRunAt || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  async saveAutomation(userId: string, automation: UserAutomation): Promise<UserAutomation> {
    const existing = await this.getAutomationById(userId, automation.id);
    if (existing) {
      const [updated] = await db.update(userAutomations).set({
        type: automation.type,
        enabled: automation.enabled ? 1 : 0,
        schedule: JSON.stringify(automation.schedule),
        nextRunAt: new Date(automation.nextRunAt).toISOString(),
        lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt).toISOString() : null,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, automation.id))).returning();
      
      return {
        ...updated,
        type: updated.type as AutomationType,
        enabled: updated.enabled === 1,
        schedule: (typeof updated.schedule === 'string' ? JSON.parse(updated.schedule) : updated.schedule) as AutomationSchedule,
        nextRunAt: updated.nextRunAt,
        lastRunAt: updated.lastRunAt || undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      let inserted;
      try {
        [inserted] = await db.insert(userAutomations).values({
          id: automation.id,
          userId,
          type: automation.type,
          enabled: automation.enabled ? 1 : 0,
          schedule: JSON.stringify(automation.schedule),
          nextRunAt: new Date(automation.nextRunAt).toISOString(),
          lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt).toISOString() : null,
        }).returning();
      } catch (e: any) {
        console.error('Detailed saveAutomation error:', e.message, e.cause);
        throw e;
      }
      
      return {
        ...inserted,
        type: inserted.type as AutomationType,
        enabled: inserted.enabled === 1,
        schedule: (typeof inserted.schedule === 'string' ? JSON.parse(inserted.schedule) : inserted.schedule) as AutomationSchedule,
        nextRunAt: inserted.nextRunAt,
        lastRunAt: inserted.lastRunAt || undefined,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      };
    }
  }

  async deleteAutomation(userId: string, id: string): Promise<boolean> {
    // SQLite doesn't support partial SET NULL on composite FKs, so we do it manually
    await db.update(backgroundJobs)
      .set({ automationId: null })
      .where(and(eq(backgroundJobs.userId, userId), eq(backgroundJobs.automationId, id)));
      
    const result = await db.delete(userAutomations).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, id)));
    return true;
  }

  async getAllActiveAutomations(): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.enabled, 1));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      enabled: a.enabled === 1,
      schedule: (typeof a.schedule === 'string' ? JSON.parse(a.schedule) : a.schedule) as AutomationSchedule,
      nextRunAt: a.nextRunAt,
      lastRunAt: a.lastRunAt || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }
}
