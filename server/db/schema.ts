import { 
  sqliteTable, text, uniqueIndex, foreignKey, unique, integer
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  currentRole: text('current_role').notNull(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    emailIdx: uniqueIndex('users_email_idx').on(table.email)
  };
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text().notNull(),
  revokedAt: text()
}, (table) => {
  return {
    tokenHashIdx: unique('sessions_token_hash_idx').on(table.tokenHash)
  };
});

export const careerProfiles = sqliteTable('career_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  location: text('location').notNull(),
  targetRoles: text('target_roles', { mode: 'json' }).notNull().$type<string[]>(),
  targetIndustries: text('target_industries', { mode: 'json' }).notNull().$type<string[]>(),
  languages: text('languages', { mode: 'json' }).notNull().$type<string[]>(),
  education: text('education', { mode: 'json' }).notNull().$type<any[]>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    userIdUnq: unique('career_profiles_user_id_unq').on(table.userId)
  };
});

export const experiences = sqliteTable('experiences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  isCurrent: integer('is_current', { mode: 'boolean' }),
  employmentType: text('employment_type').notNull(),
  domain: text('domain').notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    userExpUnq: unique('experiences_user_id_id_unq').on(table.userId, table.id)
  };
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  experienceId: text('experience_id'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  domain: text('domain').notNull(),
  scope: text('scope').notNull(),
  technologies: text('technologies', { mode: 'json' }).notNull().$type<string[]>(),
  metrics: text('metrics'),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
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

export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  proficiency: text('proficiency').notNull(),
  yearsExperience: integer('years_experience').notNull()
});

export const evidences = sqliteTable('evidences', {
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
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
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

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: text('company').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  seniority: text('seniority').notNull(),
  employmentType: text('employment_type').notNull(),
  description: text('description').notNull(),
  requirements: text('requirements', { mode: 'json' }).notNull().$type<any>(),
  rawText: text('raw_text').notNull(),
  url: text('url'),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    userJobUnq: unique('jobs_user_id_id_unq').on(table.userId, table.id)
  };
});

export const fitAnalyses = sqliteTable('fit_analyses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  overallSummary: text('overall_summary').notNull(),
  dimensions: text('dimensions', { mode: 'json' }).notNull().$type<any>(),
  evidenceMatrix: text('evidence_matrix', { mode: 'json' }).notNull().$type<any>(),
  strongMatches: text('strong_matches', { mode: 'json' }).notNull().$type<string[]>(),
  transferableExperiences: text('transferable_experiences', { mode: 'json' }).notNull().$type<string[]>(),
  domainGaps: text('domain_gaps', { mode: 'json' }).notNull().$type<string[]>(),
  missingEvidence: text('missing_evidence', { mode: 'json' }).notNull().$type<string[]>(),
  recommendedCvFocus: text('recommended_cv_focus', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    jobUnq: unique('fit_analyses_job_id_unq').on(table.jobId)
  };
});

export const tailoredCvs = sqliteTable('tailored_cvs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  mode: text('mode').notNull(),
  headline: text('headline').notNull(),
  summary: text('summary').notNull(),
  selectedExperiences: text('selected_experiences', { mode: 'json' }).notNull().$type<any>(),
  selectedSkills: text('selected_skills', { mode: 'json' }).notNull().$type<any>(),
  selectedProjects: text('selected_projects', { mode: 'json' }).notNull().$type<any>(),
  atsKeywordsMatched: text('ats_keywords_matched', { mode: 'json' }).notNull().$type<string[]>(),
  honestyAuditNotes: text('honesty_audit_notes', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    userJobModeUnq: unique('tailored_cvs_user_job_mode_unq').on(table.userId, table.jobId, table.mode)
  };
});

export const coverLetters = sqliteTable('cover_letters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  groundedFacts: text('grounded_facts', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade')
  };
});

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  jobId: text('job_id').notNull(),
  jobTitle: text('job_title').notNull(),
  company: text('company').notNull(),
  status: text('status').notNull(),
  appliedAt: text(),
  cvVersionId: text('cv_version_id'),
  coverLetterId: text('cover_letter_id'),
  notes: text('notes').notNull(),
  salaryTarget: text('salary_target'),
  timeline: text('timeline', { mode: 'json' }).notNull().$type<any>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    jobFk: foreignKey({
      columns: [table.userId, table.jobId],
      foreignColumns: [jobs.userId, jobs.id]
    }).onDelete('cascade'),
    userJobUnq: unique('applications_user_job_unq').on(table.userId, table.jobId)
  };
});

export const userAutomations = sqliteTable('user_automations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  enabled: integer('enabled').notNull().default(1),
  schedule: text('schedule').notNull(),
  nextRunAt: text().notNull(),
  lastRunAt: text(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
}, (table) => {
  return {
    userAutoUnq: unique('user_automations_user_id_id_unq').on(table.userId, table.id)
  };
});

export const backgroundJobs = sqliteTable('background_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobType: text('job_type').notNull(),
  automationId: text('automation_id'),
  idempotencyKey: text('idempotency_key'),
  scheduledAt: text().notNull(),
  status: text('status').notNull(),
  startedAt: text(),
  finishedAt: text(),
  progress: integer('progress').notNull().default(0),
  payload: text('payload', { mode: 'json' }).$type<any>(),
  result: text('result', { mode: 'json' }).$type<any>(),
  error: text('error'),
  attempt: integer('attempt').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  retryCount: integer('retry_count').notNull().default(0),
  logs: text('logs', { mode: 'json' }).notNull().$type<string[]>(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
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

export const searchAgents = sqliteTable('search_agents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  roles: text('roles', { mode: 'json' }).notNull().$type<string[]>(),
  seniority: text('seniority', { mode: 'json' }).notNull().$type<string[]>(),
  location: text('location'),
  mode: text('mode'),
  frequency: text('frequency').notNull(), // 'manual', '1h', '3h', 'daily'
  isActive: integer('is_active', { mode: 'boolean' }).default(1).notNull(),
  lastRunAt: text('last_run_at'),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`).notNull()
});
