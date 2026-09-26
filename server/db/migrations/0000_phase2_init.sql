CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"current_role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"location" text NOT NULL,
	"target_roles" jsonb NOT NULL,
	"target_industries" jsonb NOT NULL,
	"languages" jsonb NOT NULL,
	"education" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experiences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"is_current" boolean,
	"employment_type" text NOT NULL,
	"domain" text NOT NULL,
	"location" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"experience_id" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL,
	"scope" text NOT NULL,
	"technologies" jsonb NOT NULL,
	"metrics" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"proficiency" text NOT NULL,
	"years_experience" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"experience_id" text,
	"project_id" text,
	"type" text NOT NULL,
	"statement" text NOT NULL,
	"metric" text,
	"source" text NOT NULL,
	"confidence" text NOT NULL,
	"domain_tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"seniority" text NOT NULL,
	"employment_type" text NOT NULL,
	"description" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"raw_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fit_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"overall_summary" text NOT NULL,
	"dimensions" jsonb NOT NULL,
	"evidence_matrix" jsonb NOT NULL,
	"strong_matches" jsonb NOT NULL,
	"transferable_experiences" jsonb NOT NULL,
	"domain_gaps" jsonb NOT NULL,
	"missing_evidence" jsonb NOT NULL,
	"recommended_cv_focus" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tailored_cvs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"mode" text NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"selected_experiences" jsonb NOT NULL,
	"selected_skills" jsonb NOT NULL,
	"selected_projects" jsonb NOT NULL,
	"ats_keywords_matched" jsonb NOT NULL,
	"honesty_audit_notes" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cover_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"grounded_facts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"job_title" text NOT NULL,
	"company" text NOT NULL,
	"status" text NOT NULL,
	"applied_at" timestamp with time zone,
	"cv_version_id" text,
	"cover_letter_id" text,
	"notes" text NOT NULL,
	"salary_target" text,
	"timeline" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_automations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule" jsonb NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "background_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_type" text NOT NULL,
	"automation_id" text,
	"idempotency_key" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"logs" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" (lower(email));
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_token_hash_idx" UNIQUE("token_hash");
--> statement-breakpoint
ALTER TABLE "career_profiles" ADD CONSTRAINT "career_profiles_user_id_unq" UNIQUE("user_id");
--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_user_id_id_unq" UNIQUE("user_id","id");
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_id_unq" UNIQUE("user_id","id");
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_id_unq" UNIQUE("user_id","id");
--> statement-breakpoint
ALTER TABLE "fit_analyses" ADD CONSTRAINT "fit_analyses_job_id_unq" UNIQUE("job_id");
--> statement-breakpoint
ALTER TABLE "tailored_cvs" ADD CONSTRAINT "tailored_cvs_user_job_mode_unq" UNIQUE("user_id","job_id","mode");
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_job_unq" UNIQUE("user_id","job_id");
--> statement-breakpoint
ALTER TABLE "user_automations" ADD CONSTRAINT "user_automations_user_id_id_unq" UNIQUE("user_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "background_jobs_idempotency_idx" ON "background_jobs" ("user_id","idempotency_key") WHERE idempotency_key IS NOT NULL;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "career_profiles" ADD CONSTRAINT "career_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "experiences" ADD CONSTRAINT "experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- THIS IS THE MANUAL FIX FOR projects -> experiences 
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_experience_id_experiences_user_id_id_fk" FOREIGN KEY ("user_id","experience_id") REFERENCES "experiences"("user_id","id") ON DELETE SET NULL ("experience_id") ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "evidences" ADD CONSTRAINT "evidences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- THIS IS THE MANUAL FIX FOR evidences -> experiences
DO $$ BEGIN
 ALTER TABLE "evidences" ADD CONSTRAINT "evidences_user_id_experience_id_experiences_user_id_id_fk" FOREIGN KEY ("user_id","experience_id") REFERENCES "experiences"("user_id","id") ON DELETE SET NULL ("experience_id") ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- THIS IS THE MANUAL FIX FOR evidences -> projects
DO $$ BEGIN
 ALTER TABLE "evidences" ADD CONSTRAINT "evidences_user_id_project_id_projects_user_id_id_fk" FOREIGN KEY ("user_id","project_id") REFERENCES "projects"("user_id","id") ON DELETE SET NULL ("project_id") ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "fit_analyses" ADD CONSTRAINT "fit_analyses_user_id_job_id_jobs_user_id_id_fk" FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "tailored_cvs" ADD CONSTRAINT "tailored_cvs_user_id_job_id_jobs_user_id_id_fk" FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_job_id_jobs_user_id_id_fk" FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_job_id_jobs_user_id_id_fk" FOREIGN KEY ("user_id","job_id") REFERENCES "jobs"("user_id","id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "user_automations" ADD CONSTRAINT "user_automations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- THIS IS THE MANUAL FIX FOR background_jobs -> user_automations
DO $$ BEGIN
 ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_user_id_automation_id_user_automations_user_id_id_fk" FOREIGN KEY ("user_id","automation_id") REFERENCES "user_automations"("user_id","id") ON DELETE SET NULL ("automation_id") ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
