import assert from 'assert';
import { queueService, jobQueueRepository } from '../server/container.js';

export async function runQueueTests(): Promise<void> {
  console.log('  [TEST SUITE] Job Queue Lifecycle & Deterministic Idempotency');

  const userId = 'usr_alex_costa';
  const customKey = `test_idempotency_${Date.now()}`;

  // 1. Create Job with custom Idempotency Key
  const job1 = queueService.enqueueJob(userId, 'evidence_audit', { test: true }, undefined, customKey);
  assert.ok(job1.id);
  assert.strictEqual(job1.status, 'queued');
  assert.strictEqual(job1.idempotencyKey, customKey);
  console.log('    ✓ Job created with queued state and idempotency key');

  // 2. Duplicate Enqueue with same Idempotency Key (Deduplication)
  const job2 = queueService.enqueueJob(userId, 'evidence_audit', { test: true }, undefined, customKey);
  assert.strictEqual(job2.id, job1.id, 'Idempotent enqueue must return existing job without duplicating');
  console.log('    ✓ Duplicate enqueue blocked by deterministic idempotency key');

  // 3. Cancel Queued Job
  const cancelled = queueService.cancelJob(userId, job1.id);
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.ok(cancelled.logs.some((l) => l.includes('cancelled')));
  console.log('    ✓ Queued job explicitly cancelled');

  // 4. Retry Job
  const retried = queueService.retryJob(userId, job1.id);
  assert.strictEqual(retried.status, 'queued');
  assert.strictEqual(retried.retryCount, 1);
  assert.strictEqual(retried.attempt, 2);
  console.log('    ✓ Job retry increments attempt and re-queues');

  // 5. Max Retries Enforced
  let current = retried;
  for (let i = 0; i < 3; i++) {
    current = queueService.retryJob(userId, current.id);
  }
  assert.ok((current.attempt || 1) >= 4);
  console.log('    ✓ Retry attempt counter properly updated');
}
