import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { searchAgents } from '../db/schema.js';
import { randomUUID } from 'crypto';
import type { SearchPlan } from '../../src/shared/searchPlan.js';

export class SqliteSearchAgentRepository {
  async getByUserId(userId: string) {
    return db.select().from(searchAgents).where(eq(searchAgents.userId, userId));
  }

  /** Saved prompt search: the plan is what runs; roles/seniority are kept for older readers. */
  async create(userId: string, data: { name: string; prompt?: string; plan: SearchPlan; frequency?: string }) {
    const [inserted] = await db.insert(searchAgents).values({
      id: `agent_${randomUUID()}`,
      userId,
      name: data.name,
      roles: data.plan.terms,
      seniority: data.plan.preferredSeniority,
      location: data.plan.locations.map((l) => l.label).join('; '),
      mode: '',
      frequency: data.frequency || 'manual',
      prompt: data.prompt || null,
      plan: data.plan,
      isActive: true,
    }).returning();
    return inserted;
  }

  async update(id: string, userId: string, data: any) {
    const [updated] = await db.update(searchAgents).set({
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: undefined
    }).where(and(eq(searchAgents.id, id), eq(searchAgents.userId, userId))).returning();
    return updated;
  }

  async delete(id: string, userId: string) {
    await db.delete(searchAgents).where(and(eq(searchAgents.id, id), eq(searchAgents.userId, userId)));
  }
}

export const searchAgentRepository = new SqliteSearchAgentRepository();
