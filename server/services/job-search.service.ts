import type { FitAnalysis, Job, UserCareerLake } from '../../src/shared/types.js';
import { normalizeForMatch } from '../../src/shared/text.js';
import { JobScraperService, ScrapedJob, WorkMode } from './job-scraper.service.js';
import type { AIService } from './ai.service.js';

// Staged job search: cheap steps first (queries, LinkedIn filters, hard filters in code,
// dedupe, keyword pre-ranking against the Lake) and the LLM only on the shortlist.

export type SeniorityLevel = 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Liderança';

export interface SearchAgentConfig {
  roles: string[];
  seniority: SeniorityLevel[];
  location?: string;
  modes: WorkMode[];
}

export interface SearchLimits {
  maxQueries: number;
  pagesPerQuery: number;
  /** Jobs whose description is fetched (one LinkedIn request each). */
  maxDescriptions: number;
  /** Jobs sent to the LLM (2 calls each: parse + fit). */
  maxAnalyses: number;
  llmConcurrency: number;
}

export const DEFAULT_LIMITS: SearchLimits = {
  maxQueries: 4,
  pagesPerQuery: 2,
  maxDescriptions: 20,
  maxAnalyses: 8,
  llmConcurrency: 2,
};

export interface EvaluatedJob {
  job: Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  analysis: Omit<FitAnalysis, 'id' | 'userId' | 'createdAt' | 'jobId'> | null;
  prerank: number;
  /** Why the job has no analysis, when it has none. */
  notAnalyzedReason?: string;
}

export interface SearchStats {
  queries: string[];
  found: number;
  duplicates: number;
  outsideSeniority: number;
  noDescription: number;
  belowShortlist: number;
  analyzed: number;
  analysisFailed: number;
}

// LinkedIn f_E codes per level selected in the agent
const LINKEDIN_LEVELS: Record<SeniorityLevel, number[]> = {
  Estágio: [1],
  Júnior: [2, 3],
  Pleno: [3, 4],
  Sênior: [4],
  Especialista: [4],
  Liderança: [5, 6],
};

const LEVEL_PATTERNS: Array<[SeniorityLevel, RegExp]> = [
  ['Estágio', /\b(estagi\w*|intern(ship)?|aprendiz)\b/],
  ['Liderança', /\b(coordenador\w*|coord|gerente|manager|head|lider|leader|lead|supervisor\w*|diretor\w*|director)\b/],
  ['Especialista', /\b(especialista|specialist|staff|principal)\b/],
  ['Sênior', /\b(senior|sr|iii)\b/],
  ['Pleno', /\b(pleno|pl|mid|ii)\b/],
  ['Júnior', /\b(junior|jr|trainee|assistente|assistant|auxiliar|entry)\b/],
];

/** Seniority levels stated in a title or seniority field (e.g. "Pleno/Sênior" gives both); empty when it does not say. */
export function detectLevels(text: string): SeniorityLevel[] {
  const norm = normalizeForMatch(text);
  return LEVEL_PATTERNS.filter(([, re]) => re.test(norm)).map(([level]) => level);
}

/** Hard filter: a job is out only when it states levels and none of them was selected. Unknown passes. */
export function matchesSeniority(levels: SeniorityLevel[], selected: SeniorityLevel[]): boolean {
  if (!levels.length || !selected.length) return true;
  // "Especialista" postings are usually senior individual contributor roles
  return levels.some((l) => selected.includes(l) || (l === 'Especialista' && selected.includes('Sênior')));
}

/** Agent roles first, then the Lake's target roles, deduplicated. */
export function buildQueries(agent: SearchAgentConfig, lake: UserCareerLake, max: number): string[] {
  const seen = new Set<string>();
  const queries: string[] = [];
  for (const role of [...agent.roles, ...(lake.profile?.targetRoles || [])]) {
    const q = role.trim();
    const key = normalizeForMatch(q);
    if (!q || q.length > 60 || seen.has(key)) continue;
    seen.add(key);
    queries.push(q);
    if (queries.length >= max) break;
  }
  return queries;
}

export function dedupeKey(job: Pick<ScrapedJob, 'company' | 'title' | 'location'>): string {
  return `${normalizeForMatch(job.company)}|${normalizeForMatch(job.title)}|${normalizeForMatch(job.location)}`;
}

const STOPWORDS = new Set(
  'de da do das dos e em para com por a o as os um uma na no nas nos ao à the and of for in to with on at an or vaga vagas empresa'.split(' ')
);

function tokens(text: string): string[] {
  return normalizeForMatch(text)
    .split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Vocabulary of the Lake used for keyword pre-ranking: skills, tools, target roles, experience titles. */
export function lakeVocabulary(lake: UserCareerLake): { roleTokens: Set<string>; terms: string[] } {
  const roleTokens = new Set<string>();
  for (const r of [...(lake.profile?.targetRoles || []), ...lake.experiences.map((e) => e.title)]) {
    tokens(r).forEach((t) => roleTokens.add(t));
  }
  const terms = new Set<string>();
  for (const s of lake.skills) terms.add(normalizeForMatch(s.name));
  for (const ev of lake.evidences) (ev.tools || []).forEach((t) => terms.add(normalizeForMatch(t)));
  return { roleTokens, terms: [...terms].filter((t) => t.length > 1) };
}

/**
 * Cheap 0-100 relevance estimate: how much of the job title matches the user's roles, and how many
 * of the user's skills/tools the description mentions. Used only to choose what the LLM analyzes.
 */
export function prerankScore(job: { title: string; description: string }, vocab: ReturnType<typeof lakeVocabulary>): number {
  const titleTokens = tokens(job.title);
  const titleScore = titleTokens.length
    ? titleTokens.filter((t) => vocab.roleTokens.has(t)).length / titleTokens.length
    : 0;
  const text = ` ${normalizeForMatch(`${job.title} ${job.description}`)} `;
  const hits = vocab.terms.filter((term) => text.includes(` ${term} `)).length;
  // Saturates at 6 matching skills/tools
  const skillScore = vocab.terms.length ? Math.min(1, hits / Math.min(6, vocab.terms.length)) : 0;
  return Math.round((titleScore * 0.6 + skillScore * 0.4) * 100);
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface RunSearchDeps {
  scraper: JobScraperService;
  ai: AIService;
  log: (message: string) => Promise<void>;
}

export async function runJobSearch(
  agent: SearchAgentConfig,
  lake: UserCareerLake,
  existingJobs: Job[],
  deps: RunSearchDeps,
  limits: SearchLimits = DEFAULT_LIMITS
): Promise<{ results: EvaluatedJob[]; stats: SearchStats }> {
  const queries = buildQueries(agent, lake, limits.maxQueries);
  const stats: SearchStats = {
    queries,
    found: 0,
    duplicates: 0,
    outsideSeniority: 0,
    noDescription: 0,
    belowShortlist: 0,
    analyzed: 0,
    analysisFailed: 0,
  };
  const experienceLevels = agent.seniority.flatMap((s) => LINKEDIN_LEVELS[s] || []);

  // 1. Collect cards for every query (LinkedIn applies mode/level/date filters)
  const seenUrls = new Set(existingJobs.map((j) => j.url).filter(Boolean) as string[]);
  const seenKeys = new Set(existingJobs.map(dedupeKey));
  const candidates: ScrapedJob[] = [];
  for (const query of queries) {
    const cards = await deps.scraper.searchJobs(query, agent.location, {
      modes: agent.modes,
      experienceLevels,
      timeWindow: 'week',
      pages: limits.pagesPerQuery,
    });
    stats.found += cards.length;
    await deps.log(`Busca "${query}": ${cards.length} vagas encontradas.`);

    for (const card of cards) {
      const key = dedupeKey(card);
      if (seenUrls.has(card.url) || seenKeys.has(key)) {
        stats.duplicates++;
        continue;
      }
      seenUrls.add(card.url);
      seenKeys.add(key);
      // 2. Hard filter on the level stated in the title
      if (!matchesSeniority(detectLevels(card.title), agent.seniority)) {
        stats.outsideSeniority++;
        continue;
      }
      candidates.push(card);
    }
  }

  // 3. Fetch descriptions for the most title-relevant candidates
  const vocab = lakeVocabulary(lake);
  const byTitle = candidates
    .map((c) => ({ card: c, score: prerankScore({ title: c.title, description: '' }, vocab) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxDescriptions);
  stats.belowShortlist += candidates.length - byTitle.length;
  await deps.log(`${candidates.length} vagas novas dentro do filtro; buscando descrição de ${byTitle.length}.`);

  const withDescription: Array<{ card: ScrapedJob; description: string; prerank: number }> = [];
  const results: EvaluatedJob[] = [];
  for (const { card } of byTitle) {
    const description = await deps.scraper.fetchJobDescription(card.url);
    if (!description) {
      stats.noDescription++;
      results.push({
        job: toJob(card, ''),
        analysis: null,
        prerank: 0,
        notAnalyzedReason: 'Sem descrição completa disponível.',
      });
      continue;
    }
    withDescription.push({ card, description, prerank: prerankScore({ title: card.title, description }, vocab) });
  }

  // 4. Shortlist by keyword pre-rank; only the shortlist reaches the LLM
  withDescription.sort((a, b) => b.prerank - a.prerank);
  const shortlist = withDescription.slice(0, limits.maxAnalyses);
  stats.belowShortlist += withDescription.length - shortlist.length;
  await deps.log(`Analisando ${shortlist.length} vagas com IA (pré-ranking por palavras-chave do Career Lake).`);

  // 5. Parse + fit with bounded concurrency (the AI provider retries on rate limits)
  const analyzed = await mapWithConcurrency(shortlist, limits.llmConcurrency, async ({ card, description, prerank }) => {
    const base = toJob(card, description);
    try {
      const parsed = await deps.ai.parseJob(base.rawText);
      const job = { ...base, requirements: parsed.requirements, seniority: parsed.seniority, employmentType: parsed.employmentType };
      // Hard filter again on the real seniority read from the description (titles can mislead)
      if (!matchesSeniority(detectLevels(parsed.seniority), agent.seniority)) {
        stats.outsideSeniority++;
        await deps.log(`Descartada "${card.title}": senioridade real "${parsed.seniority}" fora do filtro.`);
        return null;
      }
      const analysis = await deps.ai.analyzeFit(lake, { ...job, id: 'pending', userId: '', createdAt: '', updatedAt: '' } as Job);
      stats.analyzed++;
      await deps.log(`Analisada "${card.title}" (${card.company}).`);
      return { job, analysis, prerank } as EvaluatedJob;
    } catch (err: any) {
      stats.analysisFailed++;
      await deps.log(`Erro ao analisar "${card.title}": ${err.message}. Vaga salva como não analisada.`);
      return { job: base, analysis: null, prerank, notAnalyzedReason: err.message } as EvaluatedJob;
    }
  });

  results.push(...analyzed.filter((r): r is EvaluatedJob => r !== null));
  return { results, stats };
}

function toJob(card: ScrapedJob, description: string): EvaluatedJob['job'] {
  return {
    title: card.title,
    company: card.company,
    location: card.location,
    seniority: card.seniority,
    employmentType: card.employmentType,
    description,
    requirements: [],
    rawText: description
      ? `Vaga: ${card.title}\nEmpresa: ${card.company}\nLocal: ${card.location}\nDescrição:\n${description}`
      : '',
    url: card.url,
  };
}

/** Parses the agent payload stored on the background job. */
export function agentFromPayload(payload: any): SearchAgentConfig {
  const list = (v: unknown): string[] =>
    (Array.isArray(v) ? v : String(v || '').split(',')).map((s: string) => s.trim()).filter(Boolean);
  const modes = list(payload?.mode).filter((m): m is WorkMode => ['Remote', 'Hybrid', 'On-site'].includes(m));
  const seniority = list(payload?.seniority).filter((s): s is SeniorityLevel =>
    ['Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista', 'Liderança'].includes(s)
  );
  return { roles: list(payload?.roles), seniority, location: payload?.location || undefined, modes };
}
