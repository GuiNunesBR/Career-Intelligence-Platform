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
[`.github/workflows/v3.1-runtime-verification.yml`](../.github/workflows/v3.1-runtime-verification.yml)
on every push and pull request against `main`. It provisions a PostgreSQL 16
service container and executes the following gate in order:

1. **Install** — `npm ci` (Node.js 22).
2. **Migrate** — `npm run db:migrate` (Drizzle migrations against the DB).
3. **Type-check** — `npx tsc --noEmit` (TypeScript 7 native compiler).
4. **Repository tests** — `vitest run server/repositories/__tests__/pg.repositories.test.ts`
   (tenant isolation & DB constraints).
5. **Integration tests** — `npm run test` (API + PgRepositories + Gate 0).
6. **Production build** — `npm run build` and verification that `server.js` is emitted.
7. **Runtime gate** — boots the server and asserts `GET /api/health` returns `{"status":"ok"}`.

### Reproducing the gate locally

A networked environment (access to the npm registry) and a running PostgreSQL
instance are required:

```bash
npm ci
export DATABASE_URL=postgresql://career_user:career_password@localhost:5432/career_lake_test
npm run db:migrate
npm run lint        # tsc --noEmit
npm run test        # integration suite
npm run build       # vite build + esbuild bundle -> server.js
PORT=3000 npm start # then: curl http://localhost:3000/api/health
```

> **Note:** Type-checking requires `node_modules` to be installed so that
> dependency type definitions (`@types/node`, `@types/react`, `pg`, etc.) resolve.
> Running `tsc` without an install reports spurious `TS2688 "Cannot find type
> definition file"` errors that are unrelated to the source code.
