# UserAutomations & Timezone Scheduling (V2.1)

## Architecture Overview
The platform cleanly separates the background architecture into distinct components:
```text
Scheduler → UserAutomation → Job Queue → Worker
```

### Components
1. **UserAutomation Entity**:
   - `id`: Unique identifier
   - `userId`: Scoped owner
   - `type`: `career_analysis` | `nightly_fit_analysis` | `evidence_audit` | `batch_job_refresh`
   - `enabled`: Boolean toggle
   - `schedule`: Frequency (`daily` | `weekly`), time (`HH:mm`), day of week (0-6), timezone (`America/Sao_Paulo`, `America/New_York`, etc.)
   - `nextRunAt`: ISO timestamp of next scheduled execution
   - `lastRunAt`: ISO timestamp of last execution

2. **Automation Scheduler (`server/scheduler/scheduler.ts`)**:
   - Runs on a lightweight 10-second polling interval with `.unref()`.
   - Checks all active automations where `new Date(auto.nextRunAt) <= now`.
   - Computes deterministic `idempotencyKey = ${userId}:${automationId}:${executionWindow}`.
   - Pushes job to the User Job Queue and calculates next schedule in the user's timezone.

3. **Job Queue & Deterministic Idempotency (`server/services/queue.service.ts`)**:
   - Prevents duplicate job creation within the same execution window.
   - Manages state machine: `queued` → `running` → `completed` | `failed` | `cancelled`.
   - Tracks `attempt` and `maxAttempts` (default: 3).

4. **Background Worker (`server/worker.ts`)**:
   - Executes jobs serially, logging step-by-step progress and persisting audit results.
   - On unhandled failures, retries up to `maxAttempts` before marking as `failed`.

## API Endpoints
- `GET /api/automations`: List user automations.
- `POST /api/automations`: Create new automation with timezone and schedule.
- `PUT /api/automations/:id`: Update schedule or toggle enabled flag.
- `DELETE /api/automations/:id`: Remove automation.
- `POST /api/automations/:id/trigger`: Manually trigger automation immediately.
