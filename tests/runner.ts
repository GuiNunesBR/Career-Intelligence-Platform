import fs from 'fs';

// Suites wipe tables, so they run on their own database file, recreated on every run.
// Set before any suite is imported: the db module opens the file at import time.
const TEST_DB_FILE = './sqlite.test.db';
process.env.NODE_ENV = 'test';
process.env.SQLITE_FILE = TEST_DB_FILE;
// SQLITE_URL takes precedence over SQLITE_FILE (see server/db/url.ts): override any value from CI
process.env.SQLITE_URL = `file:${TEST_DB_FILE}`;
for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(TEST_DB_FILE + suffix, { force: true });

const { runAuthTests } = await import('./auth.test.js');
const { runOwnershipTests } = await import('./ownership.test.js');
const { runAIValidationTests } = await import('./ai_validation.test.js');
const { runQueueTests } = await import('./queue.test.js');
const { runAutomationTests } = await import('./automation.test.js');
const { runIntegrationIsolationTest } = await import('./integration_isolation.test.js');
const { runDatabasePhase2Tests } = await import('./database_phase2.test.js');
const { runApiIntegrationTests } = await import('./api_integration.test.js');
const { runJobSearchTests } = await import('./job_search.test.js');

async function main() {
  console.log('====================================================');
  console.log('  CAREER LAKE V2.1 HARDENING — VERIFICATION RUNNER  ');
  console.log('====================================================\n');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const suites: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: '1. Authentication & Identity Hardening', fn: runAuthTests },
    { name: '2. Multi-User Ownership & Server-Side Segregation', fn: runOwnershipTests },
    { name: '3. AI Output Schemas & Evidence Grounding', fn: runAIValidationTests },
    { name: '4. Job Queue & Deterministic Idempotency', fn: runQueueTests },
    { name: '5. UserAutomations & Timezone Scheduling', fn: runAutomationTests },
    { name: '6. End-to-End Cross-User Isolation (User A vs User B)', fn: runIntegrationIsolationTest },
    { name: '7. Phase 2 Database Integration Tests', fn: runDatabasePhase2Tests },
    { name: '8. HTTP API Integration (End-to-End routes with Postgres)', fn: runApiIntegrationTests },
    { name: '9. Prompt-driven Job Search', fn: runJobSearchTests },
  ];

  for (const suite of suites) {
    try {
      await suite.fn();
      passed++;
      console.log(`  PASSED: ${suite.name}\n`);
    } catch (err: any) {
      failed++;
      console.error(`  FAILED: ${suite.name}`);
      console.error(`  Error: ${err.message}\n`, err.stack);
    }
  }

  const duration = Date.now() - start;
  console.log('====================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed in ${duration}ms`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
