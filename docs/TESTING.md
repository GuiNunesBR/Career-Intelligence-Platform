# Automated Testing Suite (V2.1)

## Overview
Career Lake includes an automated, persistent test runner located in `tests/`:

```text
tests/
  auth.test.ts                 # Registration, password hashing, login, token verification, logout
  ownership.test.ts            # Career Lake, jobs, evidence, and automation cross-user isolation
  ai_validation.test.ts        # Zod AI schemas, malformed rejection, evidence ID grounding
  queue.test.ts                # Queue states, idempotency deduplication, retry, cancellation
  automation.test.ts           # Schedule calculation, timezone offsets, independent user schedules
  integration_isolation.test.ts# Full HTTP request simulation comparing User A vs User B
  runner.ts                    # Master test harness
```

## Running Tests
Run the entire suite via:
```bash
npm test
# or
npx tsx tests/runner.ts
```

## Test Coverage
1. **Auth & Identity**:
   - `register valid user & sanitize passwordHash`
   - `duplicate email rejected`
   - `login with valid password succeeded`
   - `invalid password rejected with generic error`
   - `session token successfully verified via token hash`
   - `invalid session rejected`
   - `logout revokes session`
2. **Ownership & Segregation**:
   - `career lake records strictly isolated by user ID`
   - `cross-user job read and delete forbidden`
   - `cross-user evidence reference rejected`
   - `cross-user automation access and execution blocked`
3. **AI Output & Grounding**:
   - `valid AI output accepted by JobParsingAIOutputSchema`
   - `malformed AI output rejected by schema`
   - `hallucinated and foreign evidence IDs stripped during grounding validation`
   - `foreign job ID access in analysis service blocked`
4. **Queue & Idempotency**:
   - `job created with queued state and idempotency key`
   - `duplicate enqueue blocked by deterministic idempotency key`
   - `queued job explicitly cancelled`
   - `job retry increments attempt and re-queues`
   - `retry attempt counter properly updated`
5. **Automations & Scheduling**:
   - `daily nextRunAt calculated correctly`
   - `weekly nextRunAt with dayOfWeek calculated correctly`
   - `two users configure distinct independent automation schedules`
   - `automation state toggled`
   - `triggering automation generates job with deterministic idempotency key`
6. **Integration**:
   - `HTTP API cross-user access, mutation, and analysis strictly forbidden`
