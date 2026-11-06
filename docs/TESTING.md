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

## CI Runtime Verification Gate

The full verification pipeline runs in GitHub Actions via
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) on every push and pull
request against `main`. It uses a throwaway SQLite database
(`SQLITE_URL=file:./ci-sqlite.db`) and runs these steps in order:

1. **Install:** `npm ci` (Node.js 22).
2. **Migrate:** `npm run db:migrate`.
3. **Type-check:** strict `tsc --noEmit`.
4. **Repository tests:** `npx vitest run server/repositories/__tests__/sqlite.repositories.test.ts`
   (tenant isolation and DB constraints).
5. **Integration tests:** `npm test` (auth, ownership, AI grounding, API, job search).
   The suite always uses its own `sqlite.test.db`.
6. **Production build:** `npm run build`, then a check that `server.js` was emitted.
7. **Runtime gate:** boots the server and asserts that `GET /api/health` returns
   `{"status":"ok"}` and that the security headers are present.

### Reproducing the gate locally

```bash
npm ci
export SQLITE_URL=file:./ci-sqlite.db
npm run db:migrate
npm run lint
npx vitest run server/repositories/__tests__/sqlite.repositories.test.ts
npm test
npm run build
PORT=3000 npm start   # then: curl http://localhost:3000/api/health
```

> **Note:** type-checking needs `node_modules` installed. Without it, `tsc`
> reports spurious `TS2688 "Cannot find type definition file"` errors.
