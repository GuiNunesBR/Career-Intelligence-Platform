# Architecture Current State — Career Lake V2.1 Hardening & SaaS Readiness

## 1. Executive Summary
Career Lake is an evidence-first career intelligence platform designed around the principle:
> "O Career Lake é a fonte da verdade. O currículo é uma representação gerada do Career Lake para uma vaga específica."

The **V2.1 Hardening** release reinforces the production readiness of the application without altering the UI, frontend design discipline, or domain concepts.

---

## 2. Architecture Diagram (V2.1)

```text
                    ┌──────────────────────┐
                    │      React / Vite    │
                    │       Frontend       │
                    └──────────┬───────────┘
                               │ (Bearer Token in Authorization header)
                               ▼
                    ┌──────────────────────┐
                    │   Security Headers   │
                    │   & Rate Limiting    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Express API      │
                    │   Structured Log     │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       Auth Middleware    Service Layer     Zod Validation
       (Token Hash)       & Anti-Halluc.     (Input & AI)
             │                 │                 │
             │                 ▼                 │
             │          Repository Layer        │
             │                 │                 │
             │                 ▼                 │
             │            JSON Store             │
             │                                   │
             └───────────────────────────────────┘
                               │
                               ▼
                       AI Service Wrapper
                               │
                               ▼
                           Gemini API

      ┌──────────────────────────────────────────────────────────┐
      │                   Background Subsystem                   │
      │                                                          │
      │  Automation Scheduler                                    │
      │         │                                                │
      │         ▼                                                │
      │  UserAutomation (Timezone & Schedule)                    │
      │         │                                                │
      │         ▼                                                │
      │  Deterministic Idempotency Key                           │
      │         │                                                │
      │         ▼                                                │
      │  Job Queue (queued, running, completed, failed, cancel) │
      │         │                                                │
      │         ▼                                                │
      │  Serial Background Worker (Retries & Audit Logs)         │
      └──────────────────────────────────────────────────────────┘
```

---

## 3. Key Upgrades in V2.1

1. **Identity & Authentication Hardening**:
   - `bcryptjs` password hashing with salt rounds 10.
   - User entity includes `passwordHash`, stripped before returning sanitized user.
   - Session store indexes by SHA-256 `tokenHash`.
   - Generic error messages for failed login (`Invalid credentials`).

2. **AI Output Validation & Grounding**:
   - Dedicated schemas in `server/validation/ai_schemas.ts` (`JobParsingAIOutputSchema`, `FitAnalysisAIOutputSchema`, `TailoringCVAIOutputSchema`, `CoverLetterAIOutputSchema`).
   - Strict evidence ID ownership validation: referenced evidence IDs must exist and belong to the authenticated user. Hallucinated IDs are stripped.
   - Job ownership verification: users cannot analyze or tailor against foreign jobs.

3. **UserAutomations & Timezone Scheduling**:
   - `UserAutomation` entity with daily/weekly frequency, execution time, and user timezone (`America/Sao_Paulo`, `America/New_York`, etc.).
   - Distinct `AutomationScheduler` polling active automations and computing deterministic `idempotencyKey = ${userId}:${automationId}:${executionWindow}`.

4. **Deterministic Idempotency**:
   - Deduplication prevents multiple executions within the same window.
   - Job state machine: `queued`, `running`, `completed`, `failed`, `cancelled` with max 3 attempts.

5. **Security Hardening**:
   - In-memory rate limiting for auth and AI endpoints.
   - Standard HTTP security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`).
   - Sanitized structured logger without sensitive tokens or credentials.

6. **Persistent Automated Test Suite**:
   - 6 test suites covering auth, ownership, AI validation, queue, automations, and HTTP isolation. Run with `npm test`.
