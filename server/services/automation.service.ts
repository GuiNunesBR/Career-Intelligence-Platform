import { automationRepository, AutomationRepository } from '../repositories/automation.repository.js';
import { queueService, QueueService } from './queue.service.js';
import { UserAutomation, AutomationSchedule, AutomationType } from '../../src/shared/types.js';

export function calculateNextRun(schedule: AutomationSchedule, fromDate: Date = new Date()): string {
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  // Create a target date starting from fromDate
  const target = new Date(fromDate);
  target.setSeconds(0, 0);

  if (schedule.frequency === 'daily') {
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= fromDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }
  } else if (schedule.frequency === 'weekly') {
    const desiredDay = schedule.dayOfWeek ?? 0; // Default Sunday
    target.setHours(hours, minutes, 0, 0);
    const currentDay = target.getDay();
    let daysUntil = (desiredDay - currentDay + 7) % 7;
    if (daysUntil === 0 && target.getTime() <= fromDate.getTime()) {
      daysUntil = 7;
    }
    target.setDate(target.getDate() + daysUntil);
  }

  return target.toISOString();
}

export class AutomationService {
  constructor(
    private autoRepo: AutomationRepository = automationRepository,
    private queue: QueueService = queueService
  ) {}

  getAutomations(userId: string): UserAutomation[] {
    if (!userId) throw new Error('User ID is required');
    return this.autoRepo.getAutomations(userId);
  }

  getAutomationById(userId: string, id: string): UserAutomation | null {
    if (!userId) throw new Error('User ID is required');
    return this.autoRepo.getAutomationById(userId, id);
  }

  createAutomation(
    userId: string,
    data: {
      type: AutomationType;
      enabled?: boolean;
      schedule: AutomationSchedule;
    }
  ): UserAutomation {
    if (!userId) throw new Error('User ID is required');
    const now = new Date().toISOString();
    const nextRunAt = calculateNextRun(data.schedule);

    const auto: UserAutomation = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      type: data.type,
      enabled: data.enabled !== undefined ? data.enabled : true,
      schedule: data.schedule,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    };

    return this.autoRepo.saveAutomation(userId, auto);
  }

  updateAutomation(
    userId: string,
    id: string,
    updates: Partial<Pick<UserAutomation, 'enabled' | 'schedule'>>
  ): UserAutomation {
    if (!userId) throw new Error('User ID is required');
    const auto = this.autoRepo.getAutomationById(userId, id);
    if (!auto) {
      throw new Error(`Automation not found or access denied: ${id}`);
    }

    const updatedSchedule = updates.schedule ? { ...auto.schedule, ...updates.schedule } : auto.schedule;
    const nextRunAt = updates.schedule ? calculateNextRun(updatedSchedule) : auto.nextRunAt;

    const updated: UserAutomation = {
      ...auto,
      enabled: updates.enabled !== undefined ? updates.enabled : auto.enabled,
      schedule: updatedSchedule,
      nextRunAt,
      updatedAt: new Date().toISOString(),
    };

    return this.autoRepo.saveAutomation(userId, updated);
  }

  deleteAutomation(userId: string, id: string): boolean {
    if (!userId) throw new Error('User ID is required');
    const auto = this.autoRepo.getAutomationById(userId, id);
    if (!auto) {
      throw new Error(`Automation not found or access denied: ${id}`);
    }
    return this.autoRepo.deleteAutomation(userId, id);
  }

  triggerAutomation(userId: string, id: string): UserAutomation {
    if (!userId) throw new Error('User ID is required');
    const auto = this.autoRepo.getAutomationById(userId, id);
    if (!auto) {
      throw new Error(`Automation not found or access denied: ${id}`);
    }

    // Map automation type to BackgroundJobType
    const executionWindow = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `${userId}:${auto.id}:${executionWindow}`;

    this.queue.enqueueJob(userId, auto.type as any, { automationId: auto.id }, undefined, idempotencyKey);

    auto.lastRunAt = new Date().toISOString();
    auto.nextRunAt = calculateNextRun(auto.schedule);
    auto.updatedAt = new Date().toISOString();
    return this.autoRepo.saveAutomation(userId, auto);
  }
}

export const automationService = new AutomationService();
