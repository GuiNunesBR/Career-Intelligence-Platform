-- SQLite schema for Career Lake (libsql / better-sqlite compatible).
-- Mirrors server/db/schema.ts. Foreign keys are declared inline because
-- SQLite does not support ALTER TABLE ... ADD CONSTRAINT. Enforcement of
-- these constraints requires `PRAGMA foreign_keys = ON;` on each connection.

PRAGMA foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"current_role" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"token_hash" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" text NOT NULL,
	"revokedAt" text,
	CONSTRAINT "sessions_token_hash_idx" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"location" text NOT NULL,
	"target_roles" text NOT NULL,
	"target_industries" text NOT NULL,
	"languages" text NOT NULL,
	"education" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "career_profiles_user_id_unq" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"is_current" integer,
	"employment_type" text NOT NULL,
	"domain" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "experiences_user_id_id_unq" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"experience_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL,
	"scope" text NOT NULL,
	"technologies" text NOT NULL,
	"metrics" text,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "projects_user_id_id_unq" UNIQUE("user_id","id"),
	-- Composite FK enforces that a project may only link to an experience owned
	-- by the same user (rejects cross-tenant links on insert/update). We use
	-- NO ACTION rather than SET NULL because SQLite applies SET NULL to EVERY
	-- column of a composite FK, which would null the NOT NULL user_id. The
	-- "null experience_id on experience delete" behaviour is provided by the
	-- projects_experience_set_null trigger below.
	FOREIGN KEY ("user_id","experience_id") REFERENCES "experiences"("user_id","id") ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"proficiency" text NOT NULL,
	"years_experience" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"experience_id" text,
	"project_id" text,
	"type" text NOT NULL,
	"statement" text NOT NULL,
	"metric" text,
	"source" text NOT NULL,
	"confidence" text NOT NULL,
	"domain_tag" text,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	-- NO ACTION for the reason documented on projects above; the matching
	-- SET NULL behaviour is provided by the evidences_*_set_null triggers.
	FOREIGN KEY ("user_id","experience_id") REFERENCES "experiences"("user_id","id") ON DELETE NO ACTION,
	FOREIGN KEY ("user_id","project_id") REFERENCES "projects"("user_id","id") ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"seniority" text NOT NULL,
	"employment_type" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text NOT NULL,
	"raw_text" text NOT NULL,
	"url" text,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "jobs_user_id_id_unq" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fit_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"overall_summary" text NOT NULL,
	"dimensions" text NOT NULL,
	"evidence_matrix" text NOT NULL,
	"strong_matches" text NOT NULL,
	"transferable_experiences" text NOT NULL,
	"domain_gaps" text NOT NULL,
	"missing_evidence" text NOT NULL,
	"recommended_cv_focus" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fit_analyses_job_id_unq" UNIQUE("job_id"),
	FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tailored_cvs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"mode" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"selected_experiences" text NOT NULL,
	"selected_skills" text NOT NULL,
	"selected_projects" text NOT NULL,
	"ats_keywords_matched" text NOT NULL,
	"honesty_audit_notes" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tailored_cvs_user_job_mode_unq" UNIQUE("user_id","job_id","mode"),
	FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cover_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"grounded_facts" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"status" text NOT NULL,
	"appliedAt" text,
	"cv_version_id" text,
	"cover_letter_id" text,
	"notes" text NOT NULL,
	"salary_target" text,
	"timeline" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "applications_user_job_unq" UNIQUE("user_id","job_id"),
	FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_automations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"type" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"schedule" text NOT NULL,
	"nextRunAt" text NOT NULL,
	"lastRunAt" text,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_automations_user_id_id_unq" UNIQUE("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "background_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"job_type" text NOT NULL,
	"automation_id" text,
	"idempotency_key" text,
	"scheduledAt" text NOT NULL,
	"status" text NOT NULL,
	"startedAt" text,
	"finishedAt" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"payload" text,
	"result" text,
	"error" text,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"logs" text NOT NULL,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	-- NO ACTION for the reason documented on projects above; the matching
	-- SET NULL behaviour is provided by the background_jobs_automation_set_null trigger.
	CONSTRAINT "background_jobs_automation_fk" FOREIGN KEY ("user_id","automation_id") REFERENCES "user_automations"("user_id","id") ON DELETE NO ACTION
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "background_jobs_idempotency_idx" ON "background_jobs" ("user_id","idempotency_key") WHERE idempotency_key IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"roles" text NOT NULL,
	"seniority" text NOT NULL,
	"location" text,
	"mode" text,
	"frequency" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"last_run_at" text,
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--> statement-breakpoint
-- Triggers emulate "ON DELETE SET NULL (single column)" for composite FKs.
-- SQLite's native SET NULL would null the whole composite key (including the
-- NOT NULL user_id), so we null only the linking column. BEFORE DELETE (not
-- AFTER) is required: the child link must be cleared before SQLite runs the
-- NO ACTION foreign-key check for the parent delete, otherwise the delete is
-- rejected with SQLITE_CONSTRAINT_FOREIGNKEY.
CREATE TRIGGER IF NOT EXISTS "projects_experience_set_null"
BEFORE DELETE ON "experiences"
FOR EACH ROW
BEGIN
	UPDATE "projects" SET "experience_id" = NULL
	WHERE "user_id" = OLD."user_id" AND "experience_id" = OLD."id";
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "evidences_experience_set_null"
BEFORE DELETE ON "experiences"
FOR EACH ROW
BEGIN
	UPDATE "evidences" SET "experience_id" = NULL
	WHERE "user_id" = OLD."user_id" AND "experience_id" = OLD."id";
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "evidences_project_set_null"
BEFORE DELETE ON "projects"
FOR EACH ROW
BEGIN
	UPDATE "evidences" SET "project_id" = NULL
	WHERE "user_id" = OLD."user_id" AND "project_id" = OLD."id";
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS "background_jobs_automation_set_null"
BEFORE DELETE ON "user_automations"
FOR EACH ROW
BEGIN
	UPDATE "background_jobs" SET "automation_id" = NULL
	WHERE "user_id" = OLD."user_id" AND "automation_id" = OLD."id";
END;
