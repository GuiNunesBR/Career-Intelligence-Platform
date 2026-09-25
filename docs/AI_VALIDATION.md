# AI Output Validation & Grounding (V2.1)

## Current Implementation
All generative AI responses (Gemini API `gemini-3.8-flash` or deterministic fallback) are strictly decoupled from immediate persistence.

### Verification Pipeline
```text
Gemini API / Heuristic Engine
             ↓
Raw Output String (JSON)
             ↓
Zod Runtime Schema Validation (ai_schemas.ts)
             ↓
Business Domain Validation
             ↓
Evidence Ownership & Scope Check
             ↓
Job Ownership Verification
             ↓
Persist to Repository
```

## AI Output Schemas (`server/validation/ai_schemas.ts`)
- `JobParsingAIOutputSchema`: Validates structured titles, companies, locations, and requirements categories.
- `FitAnalysisAIOutputSchema`: Enforces 0-100 numerical bounds across all 9 fit dimensions and structured matrix items.
- `TailoringCVAIOutputSchema`: Ensures mode fidelity, honest audit notes, and experience citations.
- `CoverLetterAIOutputSchema`: Validates recipient, subject, body, and grounded fact citations.

## Anti-Hallucination & Evidence Verification
1. **Evidence ID Verification**: Every evidence ID cited in the output must exist in the user's `lake.evidences` array and have `ev.userId === req.user.id`. Foreign or hallucinated IDs are stripped.
2. **Experience & Project Integrity**: Experiences and projects referenced in tailored outputs must exist in the candidate's verified career history.
3. **Job Scoping**: Fit analysis and tailored CV generation explicitly verify that `job.userId === req.user.id`. Accessing or analyzing foreign jobs is rejected with `403 Forbidden` / `404 Not Found`.

## Known Limitations & Future Evolution
- Vector embeddings and semantic similarity metrics can augment deterministic evidence matching in V3.
