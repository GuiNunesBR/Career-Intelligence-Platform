import type { FitAnalysis, EvidenceMatrixItem } from './types.js';
import { computeFitScores, fitBand, headlineScore } from './fitScore.js';

// Prompt-driven job search ("busca via prompt"): the user describes the search in plain words,
// the model turns it into this plan, the user reviews/edits it, and the server executes it.

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';
export type SeniorityLevel = 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Liderança';

export const SENIORITY_LEVELS: SeniorityLevel[] = ['Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista', 'Liderança'];
export const WORK_MODES: WorkMode[] = ['Remote', 'Hybrid', 'On-site'];
export const WORK_MODE_LABEL: Record<WorkMode, string> = { Remote: 'Remoto', Hybrid: 'Híbrido', 'On-site': 'Presencial' };

export interface SearchLocation {
  /** Human label shown in the UI, e.g. "Rio de Janeiro e Grande Rio". */
  label: string;
  /** Location string sent to LinkedIn, e.g. "Rio de Janeiro, Brasil" or "Brasil". */
  linkedinLocation: string;
  /** Accepted work modes for this location; empty = any. */
  modes: WorkMode[];
}

export interface SearchPlan {
  terms: string[];
  locations: SearchLocation[];
  /** Only postings published within this many days. */
  postedWithinDays: number;
  /** How many unique jobs (after filters) the user wants to see. */
  targetResults: number;
  /** How many of the best jobs get the full fit analysis. */
  analyzeTop: number;
  /** Words that discard a job when present in its title (checked in code). */
  excludeTitleTerms: string[];
  /** Rules checked against the full posting text, e.g. "inglês avançado obrigatório". */
  excludeRules: string[];
  /** Explicit exceptions to the rules, e.g. "vagas afirmativas para mulheres valem". */
  allowNotes: string[];
  preferredSeniority: SeniorityLevel[];
  preferredSectors: string[];
  /** Generate a tailored ATS CV for the recommended jobs at the end of the search. */
  autoTailorCv: boolean;
}

export const PLAN_LIMITS = {
  terms: 12,
  locations: 4,
  maxDays: 30,
  maxTarget: 50,
  maxAnalyze: 15,
  maxAutoCv: 5,
};

export const DEFAULT_PLAN: SearchPlan = {
  terms: [],
  locations: [{ label: 'Brasil', linkedinLocation: 'Brasil', modes: [] }],
  postedWithinDays: 7,
  targetResults: 20,
  analyzeTop: 10,
  excludeTitleTerms: [],
  excludeRules: [],
  allowNotes: [],
  preferredSeniority: [],
  preferredSectors: [],
  autoTailorCv: true,
};

/** What the triage read in the posting text (each claim backed by a quote, or "Não informado"). */
export interface JobSearchMeta {
  searchRunId?: string;
  linkedinId?: string;
  postedAt?: string;
  /** Location of the plan that found the job. */
  foundIn?: string;
  workMode?: string;
  workModeQuote?: string;
  contractType?: string;
  contractQuote?: string;
  sector?: string;
  industries?: string;
  applicants?: string;
  matchedTerms?: string[];
}

export type Recommendation = 'Sim' | 'Talvez' | 'Não';

export interface RecommendationResult {
  verdict: Recommendation;
  reason: string;
  score: number | null;
}

const IMPORTANCE_RANK = { critical: 0, high: 1, medium: 2, nice_to_have: 3 } as const;
// What the job is about first; formal requirements (education, language) last
const CATEGORY_RANK: Record<string, number> = {
  Functional: 0, Domain: 1, Technical: 2, Tool: 2, Stakeholder: 3, Leadership: 3, Seniority: 4, Certification: 5, Language: 6, Education: 7,
};

/** Deterministic "is it worth applying?" from the fit score and the critical gaps. */
export function recommend(analysis: FitAnalysis | null | undefined): RecommendationResult {
  const score = headlineScore(analysis);
  if (!analysis || score === null) return { verdict: 'Talvez', reason: 'Sem análise de fit ainda.', score: null };
  const { criticalGaps } = computeFitScores(analysis.evidenceMatrix || []);
  const band = fitBand(score);
  if (criticalGaps.length) {
    return {
      verdict: 'Não',
      reason: `Requisito obrigatório sem comprovação: ${criticalGaps[0].requirementDescription}`,
      score,
    };
  }
  if (score >= 60) return { verdict: 'Sim', reason: `Match ${band.toLowerCase()} e nenhum requisito obrigatório em aberto.`, score };
  if (score >= 40) return { verdict: 'Talvez', reason: 'Match parcial: vale se o CV destacar as experiências transferíveis.', score };
  return { verdict: 'Não', reason: 'Poucos requisitos com evidência no Career Lake.', score };
}

/** Strongest matches and real gaps (requirements with no evidence), most important first. */
export function fitHighlights(analysis: FitAnalysis | null | undefined, max = 3): { matches: string[]; gaps: string[] } {
  if (!analysis) return { matches: [], gaps: [] };
  const sorted = [...(analysis.evidenceMatrix || [])].sort(
    (a: EvidenceMatrixItem, b: EvidenceMatrixItem) =>
      IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] || (CATEGORY_RANK[a.category] ?? 4) - (CATEGORY_RANK[b.category] ?? 4)
  );
  const matchOrder = [...sorted].sort(
    (a, b) => (CATEGORY_RANK[a.category] ?? 4) - (CATEGORY_RANK[b.category] ?? 4) || IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance]
  );
  return {
    matches: matchOrder.filter((i) => i.evidenceType === 'direct' || i.evidenceType === 'derived').slice(0, max).map((i) => i.requirementDescription),
    gaps: sorted.filter((i) => i.evidenceType === 'gap' && i.importance !== 'nice_to_have').slice(0, max).map((i) => i.requirementDescription),
  };
}
