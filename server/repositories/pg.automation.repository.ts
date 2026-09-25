import { eq, and } from 'drizzle-orm';
import { IAutomationRepository } from './interfaces.js';
import { UserAutomation, AutomationType, AutomationSchedule } from '../../src/shared/types.js';
import { db } from '../db/postgres.js';
import { userAutomations } from '../db/schema.js';

export class PgAutomationRepository implements IAutomationRepository {
  getAutomations(userId: string): UserAutomation[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getAutomationsAsync(userId: string): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.userId, userId));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      schedule: a.schedule as AutomationSchedule,
      nextRunAt: a.nextRunAt.toISOString(),
      lastRunAt: a.lastRunAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  getAutomationById(userId: string, id: string): UserAutomation | null {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getAutomationByIdAsync(userId: string, id: string): Promise<UserAutomation | null> {
    const result = await db.select().from(userAutomations).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, id))).limit(1);
    if (result.length === 0) return null;
    const a = result[0];
    return {
      ...a,
      type: a.type as AutomationType,
      schedule: a.schedule as AutomationSchedule,
      nextRunAt: a.nextRunAt.toISOString(),
      lastRunAt: a.lastRunAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  saveAutomation(userId: string, automation: UserAutomation): UserAutomation {
    throw new Error('Not implemented: requires async adaptation');
  }

  async saveAutomationAsync(userId: string, automation: UserAutomation): Promise<UserAutomation> {
    const existing = await this.getAutomationByIdAsync(userId, automation.id);
    if (existing) {
      const [updated] = await db.update(userAutomations).set({
        type: automation.type,
        enabled: automation.enabled,
        schedule: automation.schedule,
        nextRunAt: new Date(automation.nextRunAt),
        lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt) : null,
        updatedAt: new Date(),
      }).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, automation.id))).returning();
      
      return {
        ...updated,
        type: updated.type as AutomationType,
        schedule: updated.schedule as AutomationSchedule,
        nextRunAt: updated.nextRunAt.toISOString(),
        lastRunAt: updated.lastRunAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
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
        nextRunAt: inserted.nextRunAt.toISOString(),
        lastRunAt: inserted.lastRunAt?.toISOString(),
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      };
    }
  }

  deleteAutomation(userId: string, id: string): boolean {
    throw new Error('Not implemented: requires async adaptation');
  }

  async deleteAutomationAsync(userId: string, id: string): Promise<boolean> {
    const result = await db.delete(userAutomations).where(and(eq(userAutomations.userId, userId), eq(userAutomations.id, id))).returning({ id: userAutomations.id });
    return result.length > 0;
  }

  getAllActiveAutomations(): UserAutomation[] {
    throw new Error('Not implemented: requires async adaptation');
  }

  async getAllActiveAutomationsAsync(): Promise<UserAutomation[]> {
    const result = await db.select().from(userAutomations).where(eq(userAutomations.enabled, true));
    return result.map(a => ({
      ...a,
      type: a.type as AutomationType,
      schedule: a.schedule as AutomationSchedule,
      nextRunAt: a.nextRunAt.toISOString(),
      lastRunAt: a.lastRunAt?.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }
}
