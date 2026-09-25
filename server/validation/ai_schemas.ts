import { z } from 'zod';

export const RequirementCategorySchema = z.enum([
  'Functional',
  'Domain',
  'Technical',
  'Leadership',
  'Stakeholder',
  'Education',
  'Language',
  'Seniority',
  'Tool',
  'Certification',
]);

export const JobRequirementAIOutputSchema = z.object({
  requirementId: z.string().optional(),
  category: RequirementCategorySchema.or(z.string()),
  description: z.string().min(1, 'Requirement description cannot be empty'),
  importance: z.enum(['critical', 'high', 'medium', 'nice_to_have']),
  evidenceRequired: z.string().min(1, 'Evidence requirement description cannot be empty'),
});

export const JobParsingAIOutputSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().min(1, 'Location is required'),
  seniority: z.string().min(1, 'Seniority is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  description: z.string().min(1, 'Description is required'),
  requirements: z.array(JobRequirementAIOutputSchema).min(1, 'At least one requirement is required'),
});

export const EvidenceSourceReferenceSchema = z.object({
  type: z.enum(['experience', 'project', 'skill', 'evidence']),
  id: z.string().min(1, 'Source reference ID is required'),
  label: z.string().min(1, 'Source reference label is required'),
});

export const EvidenceMatrixItemAIOutputSchema = z.object({
  requirementId: z.string().min(1),
  requirementDescription: z.string().min(1),
  category: RequirementCategorySchema,
  importance: z.enum(['critical', 'high', 'medium', 'nice_to_have']),
  evidenceFound: z.string(),
  evidenceType: z.enum(['direct', 'derived', 'transferable', 'gap', 'unknown']),
  strength: z.enum(['high', 'medium', 'low', 'none']),
  notes: z.string(),
  sourceReferences: z.array(EvidenceSourceReferenceSchema),
});

export const FitDimensionsAIOutputSchema = z.object({
  functionalFit: z.number().min(0).max(100),
  domainFit: z.number().min(0).max(100),
  technicalFit: z.number().min(0).max(100),
  seniorityScopeFit: z.number().min(0).max(100),
  leadershipFit: z.number().min(0).max(100),
  stakeholderFit: z.number().min(0).max(100),
  languageFit: z.number().min(0).max(100),
  evidenceStrength: z.number().min(0).max(100),
  transferability: z.number().min(0).max(100),
});

export const FitAnalysisAIOutputSchema = z.object({
  jobId: z.string().optional(),
  overallSummary: z.string().min(1, 'Overall summary is required'),
  dimensions: FitDimensionsAIOutputSchema,
  evidenceMatrix: z.array(EvidenceMatrixItemAIOutputSchema),
  strongMatches: z.array(z.string()),
  transferableExperiences: z.array(z.string()),
  domainGaps: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  recommendedCvFocus: z.array(z.string()),
});

export const TailoredCVExperienceAIOutputSchema = z.object({
  experienceId: z.string().min(1),
  company: z.string().min(1),
  title: z.string().min(1),
  period: z.string().min(1),
  bullets: z.array(z.string()).min(1),
  evidenceCitations: z.array(z.string()),
});

export const TailoredCVSkillAIOutputSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  evidenceRef: z.string(),
});

export const TailoredCVProjectAIOutputSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1),
  description: z.string(),
  outcomes: z.array(z.string()),
});

export const TailoringCVAIOutputSchema = z.object({
  mode: z.enum(['conservative', 'balanced', 'aggressive']),
  headline: z.string().min(1),
  summary: z.string().min(1),
  selectedExperiences: z.array(TailoredCVExperienceAIOutputSchema),
  selectedSkills: z.array(TailoredCVSkillAIOutputSchema),
  selectedProjects: z.array(TailoredCVProjectAIOutputSchema),
  atsKeywordsMatched: z.array(z.string()),
  honestyAuditNotes: z.array(z.string()),
});

export const CoverLetterAIOutputSchema = z.object({
  recipient: z.string().min(1),
  subject: z.string().min(1),
  content: z.string().min(1),
  groundedFacts: z.array(z.string()),
});
