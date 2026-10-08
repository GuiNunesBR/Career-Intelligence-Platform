import type { EvidenceMatrixItem, EvidenceType, FitAnalysis, FitDimensions, RequirementCategory } from './types.js';

// Deterministic, auditable fit scoring. The LLM only classifies each requirement;
// every number shown to the user is derived here from those classifications.

const IMPORTANCE_WEIGHT: Record<EvidenceMatrixItem['importance'], number> = {
  critical: 3,
  high: 2,
  medium: 1,
  nice_to_have: 0.5,
};

const EVIDENCE_CREDIT: Record<EvidenceType, number> = {
  direct: 1,
  derived: 0.75,
  transferable: 0.4,
  unknown: 0,
  gap: 0,
};

/** Overall score ceiling when a critical requirement has no support at all. */
export const CRITICAL_GAP_CAP = 40;

const DIMENSION_CATEGORIES: Record<Exclude<keyof FitDimensions, 'overallFit' | 'evidenceStrength' | 'transferability'>, RequirementCategory[]> = {
  functionalFit: ['Functional', 'Education', 'Certification'],
  domainFit: ['Domain'],
  technicalFit: ['Technical', 'Tool'],
  seniorityScopeFit: ['Seniority'],
  leadershipFit: ['Leadership'],
  stakeholderFit: ['Stakeholder'],
  languageFit: ['Language'],
};

function weightedScore(items: EvidenceMatrixItem[], credit: (item: EvidenceMatrixItem) => number): number | null {
  const total = items.reduce((sum, i) => sum + IMPORTANCE_WEIGHT[i.importance], 0);
  if (total === 0) return null; // no requirement of this kind in the job: not applicable
  const earned = items.reduce((sum, i) => sum + IMPORTANCE_WEIGHT[i.importance] * credit(i), 0);
  return Math.round((earned / total) * 100);
}

export interface FitScoreResult {
  dimensions: FitDimensions;
  /** Critical requirements classified as gap (they cap the overall score). */
  criticalGaps: EvidenceMatrixItem[];
}

export function computeFitScores(matrix: EvidenceMatrixItem[]): FitScoreResult {
  const byType = (item: EvidenceMatrixItem) => EVIDENCE_CREDIT[item.evidenceType];
  const criticalGaps = matrix.filter((i) => i.importance === 'critical' && i.evidenceType === 'gap');

  let overallFit = weightedScore(matrix, byType);
  if (overallFit !== null && criticalGaps.length > 0) overallFit = Math.min(overallFit, CRITICAL_GAP_CAP);

  const dims = {} as FitDimensions;
  for (const [dim, categories] of Object.entries(DIMENSION_CATEGORIES)) {
    dims[dim as keyof typeof DIMENSION_CATEGORIES] = weightedScore(
      matrix.filter((i) => categories.includes(i.category)),
      byType
    );
  }

  return {
    dimensions: {
      ...dims,
      overallFit,
      // Share of the job that is proven directly (not inferred or transferred)
      evidenceStrength: weightedScore(matrix, (i) => (i.evidenceType === 'direct' ? 1 : 0)),
      // Among requirements not proven directly, how much is covered by inference or transfer
      transferability: weightedScore(
        matrix.filter((i) => i.evidenceType !== 'direct'),
        (i) => (i.evidenceType === 'derived' || i.evidenceType === 'transferable' ? 1 : 0)
      ),
    },
    criticalGaps,
  };
}

export type FitBand = 'Forte' | 'Bom' | 'Possível' | 'Fraco';

export function fitBand(score: number): FitBand {
  if (score >= 75) return 'Forte';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Possível';
  return 'Fraco';
}

/** Headline score of an analysis (legacy analyses predate overallFit). */
export function headlineScore(analysis: Pick<FitAnalysis, 'dimensions'> | null | undefined): number | null {
  if (!analysis) return null;
  return analysis.dimensions.overallFit ?? analysis.dimensions.functionalFit ?? null;
}
