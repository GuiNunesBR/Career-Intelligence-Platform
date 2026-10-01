import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { searchAgents } from '../db/schema.js';

export class SqliteSearchAgentRepository {
  async getByUserId(userId: string) {
    return db.select().from(searchAgents).where(eq(searchAgents.userId, userId));
  }

  async create(userId: string, data: any) {
    const id = `agent_${Date.now()}`;
    const [inserted] = await db.insert(searchAgents).values({
      id,
      userId,
      name: data.name,
      roles: data.roles || [],
      seniority: data.seniority || [],
      location: data.location || '',
      mode: data.mode || '',
      frequency: data.frequency || 'manual',
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
