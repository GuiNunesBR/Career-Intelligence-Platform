import { runAuthTests } from './auth.test.js';
import { runOwnershipTests } from './ownership.test.js';
import { runAIValidationTests } from './ai_validation.test.js';
import { runQueueTests } from './queue.test.js';
import { runAutomationTests } from './automation.test.js';
import { runIntegrationIsolationTest } from './integration_isolation.test.js';
import { runDatabasePhase2Tests } from './database_phase2.test.js';
import { runApiIntegrationTests } from './api_integration.test.js';

async function main() {
  console.log('====================================================');
  console.log('  CAREER LAKE V2.1 HARDENING — VERIFICATION RUNNER  ');
  console.log('====================================================\n');
  
  process.env.NODE_ENV = 'test';

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
