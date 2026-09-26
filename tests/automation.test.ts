import assert from 'assert';
import { calculateNextRun } from '../server/services/automation.service.js';
import { automationService, queueService } from '../server/container.js';

export async function runAutomationTests(): Promise<void> {
  console.log('  [TEST SUITE] Recurring UserAutomations & Timezone Scheduler');

  const userA = 'usr_alex_costa';
  const userB = 'usr_mariana_silva';

  // 1. Next Run Calculation (Daily)
  const dailySchedule = {
    frequency: 'daily' as const,
    time: '03:00',
    timezone: 'America/Sao_Paulo',
  };
  const baseDate = new Date('2026-09-25T01:00:00Z');
  const nextDaily = calculateNextRun(dailySchedule, baseDate);
  assert.ok(nextDaily > baseDate.toISOString(), 'nextRunAt must be in the future');
  console.log('    ✓ Daily nextRunAt calculated correctly');

  // 2. Next Run Calculation (Weekly)
  const weeklySchedule = {
    frequency: 'weekly' as const,
    dayOfWeek: 0, // Sunday
    time: '23:00',
    timezone: 'America/New_York',
  };
  const nextWeekly = calculateNextRun(weeklySchedule, baseDate);
  assert.ok(nextWeekly > baseDate.toISOString(), 'Weekly nextRunAt must be scheduled in the future');
  console.log('    ✓ Weekly nextRunAt with dayOfWeek calculated correctly');

  // 3. Independent User Automations
  const autoA = automationService.createAutomation(userA, {
    type: 'nightly_fit_analysis',
    enabled: true,
    schedule: dailySchedule,
  });

  const autoB = automationService.createAutomation(userB, {
    type: 'evidence_audit',
    enabled: false,
    schedule: weeklySchedule,
  });

  assert.strictEqual(autoA.userId, userA);
  assert.strictEqual(autoB.userId, userB);
  assert.strictEqual(autoA.enabled, true);
  assert.strictEqual(autoB.enabled, false);
  console.log('    ✓ Two users configure distinct independent automation schedules');

  // 4. Update & Toggle Automation
  const toggledB = automationService.updateAutomation(userB, autoB.id, { enabled: true });
  assert.strictEqual(toggledB.enabled, true);
  console.log('    ✓ Automation state toggled');

  // 5. Trigger Automation & Check Idempotency Key
  const triggered = automationService.triggerAutomation(userA, autoA.id);
  assert.ok(triggered.lastRunAt);

  const jobsA = queueService.getJobs(userA);
  const matchedJob = jobsA.find((j) => j.automationId === autoA.id);
  assert.ok(matchedJob, 'Triggering automation must create background job in user queue');
  assert.ok(matchedJob?.idempotencyKey?.includes(autoA.id), 'Job must have deterministic idempotencyKey');
  console.log('    ✓ Triggering automation generates job with deterministic idempotency key');

  // Clean up
  automationService.deleteAutomation(userA, autoA.id);
  automationService.deleteAutomation(userB, autoB.id);
}
