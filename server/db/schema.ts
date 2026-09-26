import { 
  pgTable, text, timestamp, boolean, jsonb, uniqueIndex, foreignKey, unique, integer
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  currentRole: text('current_role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(sql`lower(${table.email})`)
  };
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
}, (table) => {
  return {
    tokenHashIdx: unique('sessions_token_hash_idx').on(table.tokenHash)
  };
});

export const careerProfiles = pgTable('career_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  location: text('location').notNull(),
  targetRoles: jsonb('target_roles').notNull().$type<string[]>(),
  targetIndustries: jsonb('target_industries').notNull().$type<string[]>(),
  languages: jsonb('languages').notNull(),
  education: jsonb('education').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userIdUnq: unique('career_profiles_user_id_unq').on(table.userId)
  };
});

export const experiences = pgTable('experiences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isCurrent: boolean('is_current'),
  employmentType: text('employment_type').notNull(),
  domain: text('domain').notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userExpUnq: unique('experiences_user_id_id_unq').on(table.userId, table.id)
  };
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  experienceId: text('experience_id'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  domain: text('domain').notNull(),
  scope: text('scope').notNull(),
  technologies: jsonb('technologies').notNull().$type<string[]>(),
  metrics: text('metrics'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userProjUnq: unique('projects_user_id_id_unq').on(table.userId, table.id),
    // NOTE: Drizzle does not support ON DELETE SET NULL (experience_id). 
    // We declare 'no action' here to avoid Drizzle dropping the user_id upon delete,
    // and manually apply ON DELETE SET NULL (experience_id) in the generated SQL migration.
    expFk: foreignKey({
      columns: [table.userId, table.experienceId],
      foreignColumns: [experiences.userId, experiences.id]
    }).onDelete('no action')
  };
});

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  proficiency: text('proficiency').notNull(),
  yearsExperience: integer('years_experience').notNull()
});

export const evidences = pgTable('evidences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  experienceId: text('experience_id'),
  projectId: text('project_id'),
  type: text('type').notNull(),
  statement: text('statement').notNull(),
  metric: text('metric'),
  source: text('source').notNull(),
  confidence: text('confidence').notNull(),
  domainTag: text('domain_tag'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    // NOTE: Manually altered to ON DELETE SET NULL (experience_id) in migration
    expFk: foreignKey({
      columns: [table.userId, table.experienceId],
      foreignColumns: [experiences.userId, experiences.id]
    }).onDelete('no action'),
    // NOTE: Manually altered to ON DELETE SET NULL (project_id) in migration
    projFk: foreignKey({
      columns: [table.userId, table.projectId],
      foreignColumns: [projects.userId, projects.id]
    }).onDelete('no action')
  };
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  seniority: text('seniority').notNull(),
  employmentType: text('employment_type').notNull(),
  description: text('description').notNull(),
  requirements: jsonb('requirements').notNull(),
  rawText: text('raw_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userJobUnq: unique('jobs_user_id_id_unq').on(table.userId, table.id)
  };
});

export const fitAnalyses = pgTable('fit_analyses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  overallSummary: text('overall_summary').notNull(),
  dimensions: jsonb('dimensions').notNull(),
  evidenceMatrix: jsonb('evidence_matrix').notNull(),
  strongMatches: jsonb('strong_matches').notNull().$type<string[]>(),
  transferableExperiences: jsonb('transferable_experiences').notNull().$type<string[]>(),
  domainGaps: jsonb('domain_gaps').notNull().$type<string[]>(),
  missingEvidence: jsonb('missing_evidence').notNull().$type<string[]>(),
  recommendedCvFocus: jsonb('recommended_cv_focus').notNull().$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    jobUnq: unique('fit_analyses_job_id_unq').on(table.jobId)
  };
});

export const tailoredCvs = pgTable('tailored_cvs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  mode: text('mode').notNull(),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  selectedExperiences: jsonb('selected_experiences').notNull(),
  selectedSkills: jsonb('selected_skills').notNull(),
  selectedProjects: jsonb('selected_projects').notNull(),
  atsKeywordsMatched: jsonb('ats_keywords_matched').notNull().$type<string[]>(),
  honestyAuditNotes: jsonb('honesty_audit_notes').notNull().$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    userJobModeUnq: unique('tailored_cvs_user_job_mode_unq').on(table.userId, table.jobId, table.mode)
  };
});

export const coverLetters = pgTable('cover_letters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  groundedFacts: jsonb('grounded_facts').notNull().$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade')
  };
});

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  status: text('status').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  cvVersionId: text('cv_version_id'),
  coverLetterId: text('cover_letter_id'),
  notes: text('notes').notNull(),
  salaryTarget: text('salary_target'),
  timeline: jsonb('timeline').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    userJobUnq: unique('applications_user_job_unq').on(table.userId, table.jobId)
  };
});

export const userAutomations = pgTable('user_automations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  schedule: jsonb('schedule').notNull(),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    userAutoUnq: unique('user_automations_user_id_id_unq').on(table.userId, table.id)
  };
});

export const backgroundJobs = pgTable('background_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull(),
  automationId: text('automation_id'),
  idempotencyKey: text('idempotency_key'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  progress: integer('progress').notNull().default(0),
  result: jsonb('result'),
  error: text('error'),
  attempt: integer('attempt').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  retryCount: integer('retry_count').notNull().default(0),
  logs: jsonb('logs').notNull().$type<string[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => {
  return {
    // NOTE: Manually altered to ON DELETE SET NULL (automation_id) in migration
    autoFk: foreignKey({
      name: 'background_jobs_automation_fk',
      columns: [table.userId, table.automationId],
      foreignColumns: [userAutomations.userId, userAutomations.id]
    }).onDelete('no action'),
    idemUnq: uniqueIndex('background_jobs_idempotency_idx').on(table.userId, table.idempotencyKey).where(sql`idempotency_key IS NOT NULL`)
  };
});
