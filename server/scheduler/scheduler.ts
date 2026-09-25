import { automationRepository, queueService } from '../container.js';
import { calculateNextRun } from '../services/automation.service.js';

export class AutomationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor() {
    this.start();
  }

  public start(): void {
    if (this.timer) clearInterval(this.timer);
    // Check automations every 10 seconds; unref so it won't block Node process shutdown
    this.timer = setInterval(() => {
      this.checkAutomations();
    }, 10000);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async checkAutomations(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const activeAutomations = await automationRepository.getAllActiveAutomations();
      const now = new Date();

      for (const auto of activeAutomations) {
        if (!auto.enabled) continue;

        const nextRun = new Date(auto.nextRunAt);
        if (nextRun.getTime() <= now.getTime()) {
          // Execution window for idempotency: YYYY-MM-DD or hour
          const executionWindow = now.toISOString().slice(0, 10);
          const idempotencyKey = `${auto.userId}:${auto.id}:${executionWindow}`;

          // Enqueue job with deterministic idempotencyKey
          await queueService.enqueueJob(
            auto.userId,
            auto.type as any,
            { automationId: auto.id, automated: true },
            undefined,
            idempotencyKey
          );

          // Update lastRunAt and calculate next schedule
          auto.lastRunAt = now.toISOString();
          auto.nextRunAt = calculateNextRun(auto.schedule, now);
          auto.updatedAt = now.toISOString();
          await automationRepository.saveAutomation(auto.userId, auto);
        }
      }
    } catch (err) {
      console.error('Error in automation scheduler:', err);
    } finally {
      this.isChecking = false;
    }
  }
}

export const scheduler = new AutomationScheduler();
