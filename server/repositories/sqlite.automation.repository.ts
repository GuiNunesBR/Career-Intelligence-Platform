import { eq, and } from 'drizzle-orm';
import { IAutomationRepository } from './interfaces.js';
import { UserAutomation, AutomationType, AutomationSchedule } from '../../src/shared/types.js';
import { db } from '../db/index.js';
import { userAutomations } from '../db/schema.js';

export class SqliteAutomationRepository implements IAutomationRepository {
  async getAutomations(userId: string): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.userId, userId));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      schedule: a.schedule as AutomationSchedule,
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
      schedule: a.schedule as AutomationSchedule,
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
        enabled: automation.enabled,
        schedule: automation.schedule,
        nextRunAt: new Date(automation.nextRunAt),
        lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt) : null,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, automation.id))).returning();
      
      return {
        ...updated,
        type: updated.type as AutomationType,
        schedule: updated.schedule as AutomationSchedule,
        nextRunAt: updated.nextRunAt,
        lastRunAt: updated.lastRunAt || undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } else {
      const [inserted] = await db.insert(userAutomations).values({
        id: automation.id,
        userId,
        type: automation.type,
        enabled: automation.enabled,
        schedule: automation.schedule,
        nextRunAt: new Date(automation.nextRunAt),
        lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt) : null,
      }).returning();
      
      return {
        ...inserted,
        type: inserted.type as AutomationType,
        schedule: inserted.schedule as AutomationSchedule,
        nextRunAt: inserted.nextRunAt,
        lastRunAt: inserted.lastRunAt || undefined,
        createdAt: inserted.createdAt,
        updatedAt: inserted.updatedAt,
      };
    }
  }

  async deleteAutomation(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(userAutomations).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, id))).returning({ id: userAutomations.id });
    return result.length > 0;
  }

  async getAllActiveAutomations(): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.enabled, true));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      schedule: a.schedule as AutomationSchedule,
      nextRunAt: a.nextRunAt,
      lastRunAt: a.lastRunAt || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }
}
