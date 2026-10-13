import type { FitAnalysis, Job, UserCareerLake } from '../../src/shared/types.js';
import { normalizeForMatch } from '../../src/shared/text.js';
import { headlineScore } from '../../src/shared/fitScore.js';
import {
  DEFAULT_PLAN,
  PLAN_LIMITS,
  SENIORITY_LEVELS,
  WORK_MODES,
  type JobSearchMeta,
  type SearchPlan,
  type SeniorityLevel,
  type WorkMode,
} from '../../src/shared/searchPlan.js';
import type { JobCard, JobDetail } from './job-scraper.service.js';
import type { PlanDraft, ScreenInput, ScreenResult, ViolationClaim } from '../ai-search.js';

// Prompt-driven job search. Cheap steps first (LinkedIn filters, title rules, dedupe, reposts,
// keyword pre-rank), then the LLM: a batched triage that must quote the posting for every claim,
// and the full fit analysis only for the best few.

// ------------------------------------------------------------------
// Plan
// ------------------------------------------------------------------

function cleanList(values: unknown, max: number, maxLen = 80): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const v = String(raw ?? '').replace(/\s+/g, ' ').trim();
    const key = normalizeForMatch(v);
    if (!v || v.length > maxLen || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

/** Validates and bounds a plan coming from the model or from the user's edits. */
export function sanitizePlan(input: Partial<SearchPlan> | PlanDraft | undefined | null): SearchPlan {
  const p: any = input || {};
  const terms = cleanList(p.terms, PLAN_LIMITS.terms, 60);
  const locations = (Array.isArray(p.locations) ? p.locations : [])
    .map((l: any) => {
      const linkedinLocation = String(l?.linkedinLocation || l?.label || '').trim().slice(0, 80);
      return {
        label: String(l?.label || linkedinLocation).trim().slice(0, 80),
        linkedinLocation,
        modes: [...new Set((Array.isArray(l?.modes) ? l.modes : []).filter((m: string) => WORK_MODES.includes(m as WorkMode)))] as WorkMode[],
      };
    })
    .filter((l: { linkedinLocation: string }) => l.linkedinLocation)
    .slice(0, PLAN_LIMITS.locations);
  const targetResults = clamp(p.targetResults, 5, PLAN_LIMITS.maxTarget, DEFAULT_PLAN.targetResults);
  return {
    terms,
    locations: locations.length ? locations : DEFAULT_PLAN.locations,
    postedWithinDays: clamp(p.postedWithinDays, 1, PLAN_LIMITS.maxDays, DEFAULT_PLAN.postedWithinDays),
    targetResults,
    analyzeTop: Math.min(targetResults, clamp(p.analyzeTop, 1, PLAN_LIMITS.maxAnalyze, DEFAULT_PLAN.analyzeTop)),
    excludeTitleTerms: cleanList(p.excludeTitleTerms, 20, 40),
    excludeRules: cleanList(p.excludeRules, 10, 200),
    allowNotes: cleanList(p.allowNotes, 5, 200),
    preferredSeniority: (Array.isArray(p.preferredSeniority) ? p.preferredSeniority : []).filter((s: string) =>
      SENIORITY_LEVELS.includes(s as SeniorityLevel)
    ),
    preferredSectors: cleanList(p.preferredSectors, 8, 60),
    autoTailorCv: p.autoTailorCv !== false,
  };
}

/** Plan from the model's draft: requested terms plus the suggested ones (marked for the UI). */
export function planFromDraft(draft: PlanDraft): { plan: SearchPlan; suggestedTerms: string[] } {
  const requested = cleanList(draft.terms, PLAN_LIMITS.terms, 60);
  const requestedKeys = new Set(requested.map(normalizeForMatch));
  const suggested = cleanList(draft.suggestedTerms, 3, 60).filter((t) => !requestedKeys.has(normalizeForMatch(t)));
  const plan = sanitizePlan({ ...draft, terms: [...requested, ...suggested] } as Partial<SearchPlan>);
  return { plan, suggestedTerms: suggested.filter((t) => plan.terms.includes(t)) };
}

/** Converts an old search agent (roles/seniority/location/mode) into a plan. */
export function planFromLegacyAgent(payload: any): SearchPlan {
  const list = (v: unknown): string[] =>
    (Array.isArray(v) ? v : String(v || '').split(',')).map((s: string) => s.trim()).filter(Boolean);
  return sanitizePlan({
    terms: list(payload?.roles),
    locations: [
      {
        label: payload?.location || 'Brasil',
        linkedinLocation: payload?.location ? `${payload.location}, Brasil` : 'Brasil',
        modes: list(payload?.mode) as WorkMode[],
      },
    ],
    preferredSeniority: list(payload?.seniority) as SeniorityLevel[],
    autoTailorCv: false,
  });
}

// ------------------------------------------------------------------
// Pure helpers
// ------------------------------------------------------------------

const LEVEL_PATTERNS: Array<[SeniorityLevel, RegExp]> = [
  ['Estágio', /\b(estagi\w*|intern(ship)?|aprendiz)\b/],
  ['Liderança', /\b(coordenador\w*|coord|gerente|manager|head|lider|leader|lead|supervisor\w*|diretor\w*|director)\b/],
  ['Especialista', /\b(especialista|specialist|staff|principal)\b/],
  ['Sênior', /\b(senior|sr|iii)\b/],
  ['Pleno', /\b(pleno|pl|mid|ii)\b/],
  ['Júnior', /\b(junior|jr|trainee|assistente|assistant|auxiliar|entry)\b/],
];

/** Seniority levels stated in a title or seniority field; empty when it does not say. */
export function detectLevels(text: string): SeniorityLevel[] {
  const norm = normalizeForMatch(text);
  return LEVEL_PATTERNS.filter(([, re]) => re.test(norm)).map(([level]) => level);
}

/** First title-exclusion term found in the title (whole words, accent-insensitive). */
export function titleExclusion(title: string, terms: string[]): string | null {
  const norm = ` ${normalizeForMatch(title)} `;
  return terms.find((t) => {
    const key = normalizeForMatch(t);
    return key && norm.includes(` ${key} `);
  }) || null;
}

export function dedupeKey(job: { company: string; title: string; location: string }): string {
  return `${normalizeForMatch(job.company)}|${normalizeForMatch(job.title)}|${normalizeForMatch(job.location)}`;
}

function shingles(text: string, size = 5): Set<string> {
  const words = normalizeForMatch(text).split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(' '));
  return out;
}

/** Jaccard similarity of 5-word shingles: ~1 for the same posting text published twice. */
export function textSimilarity(a: string, b: string): number {
  const sa = shingles(a);
  const sb = shingles(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const s of sa) if (sb.has(s)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export const REPOST_SIMILARITY = 0.8;

const STOPWORDS = new Set(
  'de da do das dos e em para com por a o as os um uma na no nas nos ao à the and of for in to with on at an or vaga vagas empresa'.split(' ')
);

function tokens(text: string): string[] {
  return normalizeForMatch(text)
    .split(' ')
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Words that say the level or the kind of position, not the area: "Analista Contábil" must not
// match "Analista de Marketing" just because both are "analista".
const GENERIC_TITLE_WORDS = new Set(
  'analista especialista coordenador coordenadora gerente supervisor supervisora assistente auxiliar pessoa profissional consultor consultora executivo executiva lider head trainee junior senior pleno temporario temporaria vaga rio janeiro paulo brasil remoto hibrido presencial'.split(' ')
);

/** Distinctive words of a title or search term (area, not level). */
export function areaTokens(text: string): string[] {
  return tokens(text).filter((t) => !GENERIC_TITLE_WORDS.has(t));
}

/** Share (0-1) of the distinctive words of the best-matching search term found in the title. */
export function titleRelevance(title: string, terms: string[]): number {
  const titleWords = new Set(areaTokens(title));
  let best = 0;
  for (const term of terms) {
    const words = areaTokens(term);
    if (!words.length) continue;
    best = Math.max(best, words.filter((w) => titleWords.has(w)).length / words.length);
  }
  return best;
}

/** Vocabulary of the search and the Lake used for keyword pre-ranking. */
export function searchVocabulary(plan: SearchPlan, lake: UserCareerLake): { roleTokens: Set<string>; terms: string[]; searchTerms: string[] } {
  const roleTokens = new Set<string>();
  for (const r of [...plan.terms, ...(lake.profile?.targetRoles || []), ...lake.experiences.map((e) => e.title)]) {
    areaTokens(r).forEach((t) => roleTokens.add(t));
  }
  const terms = new Set<string>();
  for (const s of lake.skills) terms.add(normalizeForMatch(s.name));
  for (const ev of lake.evidences) (ev.tools || []).forEach((t) => terms.add(normalizeForMatch(t)));
  return { roleTokens, terms: [...terms].filter((t) => t.length > 1), searchTerms: plan.terms };
}

/**
 * Cheap 0-100 relevance: the title's area vs the searched terms (and the Lake's roles), plus Lake
 * skills/tools named in the text. Generic words (analista, pleno…) do not count.
 */
export function prerankScore(job: { title: string; description: string }, vocab: ReturnType<typeof searchVocabulary>): number {
  const titleWords = areaTokens(job.title);
  const roleOverlap = titleWords.length ? titleWords.filter((t) => vocab.roleTokens.has(t)).length / titleWords.length : 0;
  const titleScore = Math.max(titleRelevance(job.title, vocab.searchTerms), roleOverlap * 0.8);
  const text = ` ${normalizeForMatch(`${job.title} ${job.description}`)} `;
  const hits = vocab.terms.filter((term) => text.includes(` ${term} `)).length;
  const skillScore = vocab.terms.length ? Math.min(1, hits / Math.min(6, vocab.terms.length)) : 0;
  return Math.round((titleScore * 0.65 + skillScore * 0.35) * 100);
}

/** Bonus for the user's priorities (seniority and sector). */
export function priorityBonus(
  plan: SearchPlan,
  job: { title: string; seniority?: string; sector?: string; industries?: string }
): number {
  let bonus = 0;
  const levels = new Set([...detectLevels(job.title), ...detectLevels(job.seniority || '')]);
  if (plan.preferredSeniority.some((s) => levels.has(s))) bonus += 15;
  // The posting states a level and none of them is a preferred one
  else if (plan.preferredSeniority.length && levels.size) bonus -= 15;
  const sectorText = normalizeForMatch(`${job.sector || ''} ${job.industries || ''}`);
  if (sectorText && plan.preferredSectors.some((s) => {
    const key = normalizeForMatch(s);
    return key && (sectorText.includes(key) || key.split(' ').some((w) => w.length > 4 && sectorText.includes(w)));
  })) bonus += 10;
  return bonus;
}

/** A quote counts only if it is really in the posting (accent/punctuation-insensitive). */
export function quoteInText(quote: string, text: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length >= 3 && normalizeForMatch(text).includes(q);
}

/** Runs `fn` over `items` with at most `limit` in flight. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
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

// ------------------------------------------------------------------
// Pipeline
// ------------------------------------------------------------------

const BR_STATES = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const FOREIGN_MARKERS = /\b(united states|usa|estados unidos|canada|mexico|méxico|argentina|chile|colombia|colômbia|peru|portugal|spain|espanha|united kingdom|reino unido|germany|alemanha|france|frança|india|índia|emea|latam|worldwide)\b/i;

/** For searches in Brazil: true when the card's location is clearly another country. */
export function outsideBrazil(cardLocation: string): boolean {
  const loc = cardLocation.trim();
  if (!loc || /brasil|brazil/i.test(loc)) return false;
  if (FOREIGN_MARKERS.test(loc)) return true;
  const uf = loc.match(/,\s*([A-Z]{2})$/);
  return !!uf && !BR_STATES.has(uf[1]);
}

/** Title shares no area word with the searched terms nor with the Lake's roles. */
export function offTopic(title: string, vocab: ReturnType<typeof searchVocabulary>): boolean {
  if (titleRelevance(title, vocab.searchTerms) > 0) return false;
  return !areaTokens(title).some((t) => vocab.roleTokens.has(t));
}

export interface SearchRunLimits {
  /** Max card-search requests to LinkedIn. */
  maxSearchRequests: number;
  /** Max postings opened (one LinkedIn request each). */
  maxDetails: number;
  /** Postings opened per wave; waves continue until the target is reached. */
  waveSize: number;
  screenBatchSize: number;
  llmConcurrency: number;
}

export const DEFAULT_RUN_LIMITS: SearchRunLimits = {
  maxSearchRequests: 45,
  maxDetails: 60,
  waveSize: 10,
  screenBatchSize: 5,
  llmConcurrency: 2,
};

export interface DiscardedJob {
  title: string;
  company: string;
  url: string;
  reason: string;
}

export interface SearchRunItem {
  job: Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  analysis: Omit<FitAnalysis, 'id' | 'userId' | 'createdAt' | 'jobId'> | null;
  priority: number;
  notAnalyzedReason?: string;
}

export interface SearchRunStats {
  searches: number;
  linkedinRequests: number;
  cardsFound: number;
  uniqueCards: number;
  duplicates: number;
  alreadySaved: number;
  titleFiltered: number;
  offTopic: number;
  foreign: number;
  opened: number;
  unavailable: number;
  reposts: number;
  ruleDiscarded: number;
  rulesOverturned: number;
  remoteNotConfirmed: number;
  passed: number;
  belowTarget: number;
  analyzed: number;
  analysisFailed: number;
  screeningFailed: number;
}

export interface SearchRunDeps {
  scraper: {
    searchCards(search: { keywords: string; location: string; postedWithinDays: number; modes: WorkMode[]; pages: number }): Promise<JobCard[]>;
    fetchDetail(linkedinId: string): Promise<JobDetail | null>;
    requests: number;
  };
  screen: (jobs: ScreenInput[], plan: Pick<SearchPlan, 'excludeRules' | 'allowNotes'>) => Promise<ScreenResult[]>;
  /** Second reading of each flagged rule: does the quote really prove it? */
  verify: (claims: ViolationClaim[], plan: Pick<SearchPlan, 'allowNotes'>) => Promise<Array<{ id: string; proves: boolean }>>;
  ai: {
    parseJob(rawText: string): Promise<Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
    analyzeFit(lake: UserCareerLake, job: Job): Promise<Omit<FitAnalysis, 'id' | 'userId' | 'createdAt'>>;
  };
  log: (message: string) => Promise<void>;
}

export interface SearchRunOutput {
  items: SearchRunItem[];
  discarded: DiscardedJob[];
  alreadySavedJobIds: string[];
  stats: SearchRunStats;
}

interface Candidate {
  card: JobCard;
  foundIn: number;
  matchedTerms: Set<string>;
  detail?: JobDetail;
  screen?: ScreenResult;
  prerank: number;
  priority: number;
}

function pagesPerSearch(searches: number): number {
  if (searches <= 4) return 3;
  if (searches <= 10) return 2;
  return 1;
}

export async function runPlanSearch(
  plan: SearchPlan,
  lake: UserCareerLake,
  existingJobs: Job[],
  deps: SearchRunDeps,
  limits: SearchRunLimits = DEFAULT_RUN_LIMITS
): Promise<SearchRunOutput> {
  const stats: SearchRunStats = {
    searches: 0, linkedinRequests: 0, cardsFound: 0, uniqueCards: 0, duplicates: 0, alreadySaved: 0,
    titleFiltered: 0, offTopic: 0, foreign: 0, opened: 0, unavailable: 0, reposts: 0, ruleDiscarded: 0,
    rulesOverturned: 0, remoteNotConfirmed: 0, passed: 0, belowTarget: 0, analyzed: 0, analysisFailed: 0, screeningFailed: 0,
  };
  const discarded: DiscardedJob[] = [];
  const discard = (c: Candidate, reason: string) =>
    discarded.push({ title: c.card.title, company: c.card.company, url: c.card.url, reason });

  // 1. Cards: every term in every location (LinkedIn applies date and work-mode filters)
  const searches = plan.locations.flatMap((loc, foundIn) => plan.terms.map((term) => ({ term, loc, foundIn })));
  const pages = pagesPerSearch(searches.length);
  const existingByLinkedinId = new Map<string, string>();
  const existingKeys = new Map<string, string>();
  for (const j of existingJobs) {
    const id = j.searchMeta?.linkedinId || j.url?.match(/(\d{6,})/)?.[1];
    if (id) existingByLinkedinId.set(id, j.id);
    existingKeys.set(dedupeKey(j), j.id);
  }
  const alreadySaved = new Set<string>();
  const byId = new Map<string, Candidate>();
  const seenKeys = new Set<string>();
  for (const { term, loc, foundIn } of searches) {
    if (deps.scraper.requests >= limits.maxSearchRequests) {
      await deps.log(`Limite de requisições ao LinkedIn atingido; ${searches.length - stats.searches} buscas não foram feitas.`);
      break;
    }
    const cards = await deps.scraper.searchCards({
      keywords: term,
      location: loc.linkedinLocation,
      postedWithinDays: plan.postedWithinDays,
      modes: loc.modes,
      pages,
    });
    stats.searches++;
    stats.cardsFound += cards.length;
    await deps.log(`"${term}" em ${loc.label}: ${cards.length} vagas.`);
    for (const card of cards) {
      const prev = byId.get(card.linkedinId);
      if (prev) {
        prev.matchedTerms.add(term);
        stats.duplicates++;
        continue;
      }
      const savedId = existingByLinkedinId.get(card.linkedinId) || existingKeys.get(dedupeKey(card));
      if (savedId) {
        if (!alreadySaved.has(savedId)) stats.alreadySaved++;
        alreadySaved.add(savedId);
        continue;
      }
      const key = dedupeKey(card);
      if (seenKeys.has(key)) {
        stats.duplicates++;
        continue;
      }
      seenKeys.add(key);
      byId.set(card.linkedinId, { card, foundIn, matchedTerms: new Set([term]), prerank: 0, priority: 0 });
    }
  }
  stats.uniqueCards = byId.size;

  // 2. Rules that only need the card (in code): title words, country, area
  const vocab = searchVocabulary(plan, lake);
  const candidates: Candidate[] = [];
  for (const c of byId.values()) {
    const hit = titleExclusion(c.card.title, plan.excludeTitleTerms);
    if (hit) {
      stats.titleFiltered++;
      discard(c, `Título contém "${hit}".`);
      continue;
    }
    if (/brasil|brazil/i.test(plan.locations[c.foundIn].linkedinLocation) && outsideBrazil(c.card.location)) {
      stats.foreign++;
      discard(c, `Fora do Brasil (${c.card.location}).`);
      continue;
    }
    if (offTopic(c.card.title, vocab)) {
      stats.offTopic++;
      discard(c, 'Título fora da área buscada.');
      continue;
    }
    c.prerank = prerankScore({ title: c.card.title, description: '' }, vocab);
    c.priority = c.prerank + priorityBonus(plan, { title: c.card.title });
    candidates.push(c);
  }
  candidates.sort((a, b) => b.priority - a.priority || b.matchedTerms.size - a.matchedTerms.size);
  await deps.log(`${stats.uniqueCards} vagas únicas; ${candidates.length} passaram nos filtros de título e local.`);

  // 3. Open postings in waves until the target is met (or the request budget runs out)
  const opened: Candidate[] = [];
  const passed: Candidate[] = [];
  let next = 0;
  while (passed.length < plan.targetResults && next < candidates.length && stats.opened + stats.unavailable < limits.maxDetails) {
    const room = limits.maxDetails - stats.opened - stats.unavailable;
    const wave = candidates.slice(next, next + Math.min(limits.waveSize, room));
    next += wave.length;
    await deps.log(`Abrindo ${wave.length} vagas (${passed.length}/${plan.targetResults} aprovadas até agora).`);

    const fresh: Candidate[] = [];
    for (const c of wave) {
      const detail = await deps.scraper.fetchDetail(c.card.linkedinId);
      if (!detail) {
        stats.unavailable++;
        discard(c, 'Vaga indisponível ou sem descrição.');
        continue;
      }
      stats.opened++;
      c.detail = detail;
      // Reposts: same text published again (or by another company)
      const original = opened.find((o) => textSimilarity(o.detail!.description, detail.description) >= REPOST_SIMILARITY);
      if (original) {
        stats.reposts++;
        original.matchedTerms = new Set([...original.matchedTerms, ...c.matchedTerms]);
        discard(c, `Mesmo texto de "${original.card.title}" (${original.card.company}): repostagem.`);
        continue;
      }
      opened.push(c);
      fresh.push(c);
    }

    passed.push(...(await screenWave(fresh, plan, vocab, deps, limits, stats, discard)));
  }
  stats.belowTarget += candidates.length - next;
  stats.passed = passed.length;

  // 4. Keep the target number; the best ones get the full fit analysis
  passed.sort((a, b) => b.priority - a.priority);
  const kept = passed.slice(0, plan.targetResults);
  stats.belowTarget += passed.length - kept.length;
  const toAnalyze = kept.slice(0, plan.analyzeTop);
  await deps.log(`${passed.length} vagas passaram nos filtros. Analisando o fit das ${toAnalyze.length} mais promissoras.`);

  const analyze = async (c: Candidate): Promise<SearchRunItem> => {
    const base = toJob(c, plan);
    try {
      const parsed = await deps.ai.parseJob(base.rawText);
      const job = { ...base, requirements: parsed.requirements };
      const analysis = await deps.ai.analyzeFit(lake, { ...job, id: 'pending', userId: '', createdAt: '', updatedAt: '' } as Job);
      stats.analyzed++;
      await deps.log(`Analisada "${c.card.title}" (${c.card.company}).`);
      return { job, analysis, priority: c.priority };
    } catch (err: any) {
      return { job: base, analysis: null, priority: c.priority, notAnalyzedReason: err.message };
    }
  };

  const items = await mapWithConcurrency(kept, limits.llmConcurrency, async (c, idx): Promise<SearchRunItem> =>
    idx < toAnalyze.length
      ? analyze(c)
      : { job: toJob(c, plan), analysis: null, priority: c.priority, notAnalyzedReason: 'Fora das mais promissoras desta busca.' }
  );
  // One more try, one at a time, for analyses lost to a model outage
  for (const [idx, item] of items.entries()) {
    if (idx >= toAnalyze.length || item.analysis) continue;
    const retry = await analyze(kept[idx]);
    items[idx] = retry;
    if (!retry.analysis) {
      stats.analysisFailed++;
      await deps.log(`Não foi possível analisar "${kept[idx].card.title}": ${retry.notAnalyzedReason}. Salva sem análise.`);
    }
  }

  // Analyzed jobs by fit score, then the rest by priority
  items.sort((a, b) => (headlineScore(b.analysis as FitAnalysis) ?? -1) - (headlineScore(a.analysis as FitAnalysis) ?? -1) || b.priority - a.priority);
  stats.linkedinRequests = deps.scraper.requests;
  return { items, discarded, alreadySavedJobIds: [...alreadySaved], stats };
}

/** Triage of one wave: batched reading of the texts, then every rule claim double-checked. */
async function screenWave(
  wave: Candidate[],
  plan: SearchPlan,
  vocab: ReturnType<typeof searchVocabulary>,
  deps: SearchRunDeps,
  limits: SearchRunLimits,
  stats: SearchRunStats,
  discard: (c: Candidate, reason: string) => void
): Promise<Candidate[]> {
  const batches: Candidate[][] = [];
  for (let i = 0; i < wave.length; i += limits.screenBatchSize) batches.push(wave.slice(i, i + limits.screenBatchSize));
  await mapWithConcurrency(batches, limits.llmConcurrency, async (batch) => {
    try {
      const results = await deps.screen(
        batch.map((c) => ({ key: c.card.linkedinId, title: c.card.title, company: c.card.company, location: c.card.location, description: c.detail!.description })),
        plan
      );
      for (const r of results) {
        const c = batch.find((b) => b.card.linkedinId === r.key);
        if (c) c.screen = r;
      }
    } catch (err: any) {
      stats.screeningFailed += batch.length;
      await deps.log(`Triagem indisponível para ${batch.length} vagas (${err.message}); mantidas sem triagem.`);
    }
  });

  // Claims must quote the posting; rule violations get a second, focused reading
  const claims: ViolationClaim[] = [];
  for (const c of wave) {
    const s = c.screen;
    if (!s) continue;
    const text = `${c.card.title}\n${c.detail!.description}`;
    if (s.workMode !== 'Não informado' && !quoteInText(s.workModeQuote, text)) s.workMode = 'Não informado';
    if (s.contractType !== 'Não informado' && !quoteInText(s.contractQuote, text)) s.contractType = 'Não informado';
    s.violations = s.violations.filter((v) => quoteInText(v.quote, text));
    s.violations.forEach((v, i) => claims.push({ id: `${c.card.linkedinId}#${i}`, rule: v.rule, quote: v.quote, title: c.card.title }));
  }
  const proven = new Set<string>();
  if (claims.length) {
    try {
      for (const r of await deps.verify(claims, plan)) if (r.proves) proven.add(r.id);
    } catch (err: any) {
      // Without the second reading a rule is not applied: better to show a job than to hide it wrongly
      await deps.log(`Conferência das regras indisponível (${err.message}); ${claims.length} descartes não aplicados.`);
    }
    stats.rulesOverturned += claims.length - proven.size;
  }

  const passed: Candidate[] = [];
  for (const c of wave) {
    const s = c.screen;
    const violation = s?.violations.find((_, i) => proven.has(`${c.card.linkedinId}#${i}`));
    if (violation) {
      stats.ruleDiscarded++;
      discard(c, `${violation.rule}: “${violation.quote.trim()}”`);
      continue;
    }
    // Remote-only places: the text itself must say remote
    const loc = plan.locations[c.foundIn];
    if (loc.modes.length === 1 && loc.modes[0] === 'Remote' && s?.workMode !== 'Remoto') {
      stats.remoteNotConfirmed++;
      discard(c, `Busca remota (${loc.label}), mas o texto ${s && s.workMode !== 'Não informado' ? `diz ${s.workMode.toLowerCase()}` : 'não confirma trabalho remoto'}.`);
      continue;
    }
    c.prerank = prerankScore({ title: c.card.title, description: c.detail!.description }, vocab);
    c.priority =
      c.prerank +
      priorityBonus(plan, { title: c.card.title, seniority: s?.seniority || c.detail!.seniority, sector: s?.sector, industries: c.detail!.industries }) +
      Math.min(10, (c.matchedTerms.size - 1) * 5);
    passed.push(c);
  }
  return passed;
}

function toJob(c: Candidate, plan: SearchPlan): SearchRunItem['job'] {
  const d = c.detail!;
  const s = c.screen;
  const meta: JobSearchMeta = {
    linkedinId: c.card.linkedinId,
    postedAt: c.card.postedAt,
    foundIn: plan.locations[c.foundIn]?.label,
    workMode: s?.workMode || 'Não informado',
    workModeQuote: s?.workMode && s.workMode !== 'Não informado' ? s.workModeQuote : undefined,
    contractType: s?.contractType || 'Não informado',
    contractQuote: s?.contractType && s.contractType !== 'Não informado' ? s.contractQuote : undefined,
    sector: s?.sector || undefined,
    industries: d.industries,
    applicants: d.applicants,
    matchedTerms: [...c.matchedTerms],
  };
  const location = c.card.location || d.location;
  return {
    title: c.card.title,
    company: c.card.company || d.company,
    location,
    seniority: s?.seniority && s.seniority !== 'Não informado' ? s.seniority : d.seniority || 'Não informado',
    employmentType: meta.contractType !== 'Não informado' ? meta.contractType! : d.employmentType || 'Não informado',
    description: d.description,
    requirements: [],
    rawText: `Vaga: ${c.card.title}\nEmpresa: ${c.card.company}\nLocal: ${location}\nDescrição:\n${d.description}`,
    url: c.card.url,
    searchMeta: meta,
  };
}
