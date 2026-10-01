export type EvidenceType = 'direct' | 'derived' | 'transferable' | 'gap' | 'unknown';
export type EvidenceStrength = 'high' | 'medium' | 'low' | 'none';
export type EvidenceConfidence = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  currentRole: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SanitizedUser = Omit<User, 'passwordHash'>;

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  user: SanitizedUser;
  expiresAt: string;
}

export interface CareerProfile {
  id: string;
  userId: string;
  headline: string;
  summary: string;
  location: string;
  targetRoles: string[];
  targetIndustries: string[];
  languages: Array<{ language: string; proficiency: string }>;
  education: Array<{ degree: string; institution: string; year: string; field: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  userId: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  domain: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  experienceId?: string;
  name: string;
  description: string;
  domain: string;
  scope: string;
  technologies: string[];
  metrics?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  category: 'Functional' | 'Technical' | 'Domain' | 'Leadership' | 'Tool' | 'Soft' | 'Language';
  proficiency: 'Fundamental' | 'Competent' | 'Advanced' | 'Expert';
  yearsExperience: number;
}

export interface Evidence {
  id: string;
  userId: string;
  experienceId?: string;
  projectId?: string;
  type: EvidenceType;
  statement: string;
  metric?: string;
  source: string;
  confidence: EvidenceConfidence;
  domainTag?: string;
  createdAt: string;
}

export type RequirementCategory =
  | 'Functional'
  | 'Domain'
  | 'Technical'
  | 'Leadership'
  | 'Stakeholder'
  | 'Education'
  | 'Language'
  | 'Seniority'
  | 'Tool'
  | 'Certification';

export interface JobRequirement {
  requirementId: string;
  category: RequirementCategory;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'nice_to_have';
  evidenceRequired: string;
}

export interface Job {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string;
  seniority: string;
  employmentType: string;
  description: string;
  requirements: JobRequirement[];
  rawText: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceMatrixItem {
  requirementId: string;
  requirementDescription: string;
  category: RequirementCategory;
  importance: 'critical' | 'high' | 'medium' | 'nice_to_have';
  evidenceFound: string;
  evidenceType: EvidenceType;
  strength: EvidenceStrength;
  notes: string;
  sourceReferences: Array<{
    type: 'experience' | 'project' | 'skill' | 'evidence';
    id: string;
    label: string;
  }>;
}

export interface FitDimensions {
  functionalFit: number;
  domainFit: number;
  technicalFit: number;
  seniorityScopeFit: number;
  leadershipFit: number;
  stakeholderFit: number;
  languageFit: number;
  evidenceStrength: number;
  transferability: number;
}

export interface FitAnalysis {
  id: string;
  userId: string;
  jobId: string;
  overallSummary: string;
  dimensions: FitDimensions;
  evidenceMatrix: EvidenceMatrixItem[];
  strongMatches: string[];
  transferableExperiences: string[];
  domainGaps: string[];
  missingEvidence: string[];
  recommendedCvFocus: string[];
  createdAt: string;
}

export type TailoringMode = 'conservative' | 'balanced' | 'aggressive';
export type TailoringLanguage = 'pt-br' | 'en' | 'es';

export interface TailoredCVExperience {
  experienceId: string;
  company: string;
  title: string;
  period: string;
  bullets: string[];
  evidenceCitations: string[];
}

export interface TailoredCVSkill {
  name: string;
  category: string;
  evidenceRef: string;
}

export interface TailoredCVProject {
  projectId?: string;
  name: string;
  description: string;
  outcomes: string[];
}

export interface TailoredCV {
  id: string;
  userId: string;
  jobId: string;
  mode: TailoringMode;
  language?: TailoringLanguage;
  headline: string;
  summary: string;
  selectedExperiences: TailoredCVExperience[];
  selectedSkills: TailoredCVSkill[];
  selectedProjects: TailoredCVProject[];
  atsKeywordsMatched: string[];
  honestyAuditNotes: string[];
  createdAt: string;
}

export interface CoverLetter {
  id: string;
  userId: string;
  jobId: string;
  recipient: string;
  subject: string;
  content: string;
  groundedFacts: string[];
  createdAt: string;
}

export interface ApplicationAnswer {
  question: string;
  answer: string;
  evidenceGroundedIn: string[];
}

export type ApplicationStatus =
  | 'Saved'
  | 'Analyzing'
  | 'Ready to Apply'
  | 'Applied'
  | 'Recruiter Contact'
  | 'Interview'
  | 'Technical Stage'
  | 'Final Stage'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationTimelineEvent {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt?: string;
  cvVersionId?: string;
  coverLetterId?: string;
  notes: string;
  salaryTarget?: string;
  timeline: ApplicationTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export type BackgroundJobType =
  | 'nightly_analysis'
  | 'batch_job_refresh'
  | 'document_parse'
  | 'fit_recalculation'
  | 'evidence_audit'
  | 'scheduled_tailor'
  | 'job_search_agent';

export type BackgroundJobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AutomationType =
  | 'career_analysis'
  | 'nightly_fit_analysis'
  | 'evidence_audit'
  | 'batch_job_refresh';

export interface AutomationSchedule {
  frequency: 'daily' | 'weekly';
  time: string; // "HH:mm"
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc.
  timezone: string; // e.g. "America/Sao_Paulo"
}

export interface UserAutomation {
  id: string;
  userId: string;
  type: AutomationType;
  enabled: boolean;
  schedule: AutomationSchedule;
  nextRunAt: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundJob {
  id: string;
  userId: string;
  jobType: BackgroundJobType;
  automationId?: string;
  idempotencyKey?: string;
  scheduledAt: string;
  status: BackgroundJobStatus;
  payload?: any;
  startedAt?: string;
  finishedAt?: string;
  progress: number;
  result?: any;
  error?: string;
  attempt?: number;
  maxAttempts?: number;
  retryCount: number;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserCareerLake {
  profile: CareerProfile;
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  evidences: Evidence[];
}
