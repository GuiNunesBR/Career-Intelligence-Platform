import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional(),
});

export const CareerProfileUpdateSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
  targetIndustries: z.array(z.string()).optional(),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string(),
  })).optional(),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.string(),
    field: z.string(),
  })).optional(),
});

export const ExperienceCreateSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  employmentType: z.string().optional(),
  domain: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
});

export const ProjectCreateSchema = z.object({
  experienceId: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Description is required'),
  domain: z.string().min(1, 'Domain is required'),
  scope: z.string().min(1, 'Scope is required'),
  technologies: z.array(z.string()).min(1, 'At least one technology is required'),
  metrics: z.string().optional(),
});

export const SkillCreateSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.enum(['Functional', 'Domain', 'Technical', 'Leadership', 'Stakeholder', 'Language', 'Tool', 'Other']),
  proficiency: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  yearsExperience: z.number().nonnegative().optional(),
});

export const EvidenceCreateSchema = z.object({
  experienceId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(['direct', 'derived', 'transferable']),
  statement: z.string().min(5, 'Statement must be descriptive'),
  metric: z.string().min(1, 'Metric is required for auditability'),
  source: z.string().min(1, 'Source document or context is required'),
  confidence: z.enum(['high', 'medium', 'low']),
  domainTag: z.string().min(1, 'Domain tag is required'),
});

export const JobParseSchema = z.object({
  text: z.string().min(10, 'Job description text must be at least 10 characters'),
});

export const JobCreateSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  location: z.string().min(1, 'Location is required'),
  seniority: z.string().min(1, 'Seniority is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  description: z.string().min(1, 'Description is required'),
  requirements: z.array(z.object({
    requirementId: z.string(),
    category: z.string(),
    description: z.string(),
    importance: z.enum(['critical', 'high', 'medium', 'nice_to_have']),
    evidenceRequired: z.string(),
  })),
  rawText: z.string().optional(),
});

export const FitAnalysisRequestSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

export const TailorCVRequestSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  mode: z.enum(['conservative', 'balanced', 'aggressive']),
  language: z.enum(['pt-br', 'en', 'es']).optional(),
});

export const CoverLetterRequestSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

export const ApplicationCreateSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Job title is required'),
  status: z.enum([
    'saved',
    'analyzing',
    'ready_to_apply',
    'applied',
    'recruiter_contact',
    'interview',
    'technical_stage',
    'final_stage',
    'offer',
    'rejected',
  ]).default('saved'),
  notes: z.string().optional(),
  targetSalary: z.string().optional(),
  matchScore: z.number().min(0).max(100).optional(),
});

export const ApplicationStatusUpdateSchema = z.object({
  status: z.enum([
    'saved',
    'analyzing',
    'ready_to_apply',
    'applied',
    'recruiter_contact',
    'interview',
    'technical_stage',
    'final_stage',
    'offer',
    'rejected',
  ]),
});

export const BackgroundJobEnqueueSchema = z.object({
  jobType: z.enum([
    'nightly_analysis',
    'batch_job_refresh',
    'document_parse',
    'fit_recalculation',
    'evidence_audit',
    'scheduled_tailor',
    'job_search_agent',
  ]),
  payload: z.record(z.string(), z.any()).optional(),
  scheduledAt: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const UserAutomationCreateSchema = z.object({
  type: z.enum([
    'career_analysis',
    'nightly_fit_analysis',
    'evidence_audit',
    'batch_job_refresh',
  ]),
  enabled: z.boolean().default(true),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly']),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:mm'),
    dayOfWeek: z.number().min(0).max(6).optional(),
    timezone: z.string().min(1).default('America/Sao_Paulo'),
  }),
});

export const UserAutomationUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  schedule: z
    .object({
      frequency: z.enum(['daily', 'weekly']).optional(),
      time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:mm').optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      timezone: z.string().min(1).optional(),
    })
    .optional(),
});
