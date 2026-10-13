import assert from 'assert';
import {
  planFromDraft,
  runPlanSearch,
  sanitizePlan,
  textSimilarity,
  titleExclusion,
  titleRelevance,
  type SearchRunDeps,
} from '../server/services/job-search.service.js';
import { computeFitScores } from '../src/shared/fitScore.js';
import { recommend } from '../src/shared/searchPlan.js';
import type { EvidenceMatrixItem, FitAnalysis, Job, UserCareerLake } from '../src/shared/types.js';
import type { JobCard, JobDetail } from '../server/services/job-scraper.service.js';
import type { ScreenResult } from '../server/ai-search.js';

const LAKE: UserCareerLake = {
  profile: { targetRoles: ['Analista de Trade Marketing'] } as any,
  experiences: [{ title: 'Analista de Marketing', company: 'Ipiranga' } as any],
  projects: [],
  skills: [{ name: 'Trade Marketing' } as any, { name: 'CRM' } as any],
  evidences: [],
} as any;

const TRADE_TEXT =
  'Buscamos analista de trade marketing para gestão de materiais de PDV, campanhas comerciais com distribuidores e análise de sell-out em toda a região metropolitana do Rio de Janeiro com reporte para a gerência.';

function matrix(evidenceType: EvidenceMatrixItem['evidenceType'], importance: EvidenceMatrixItem['importance'] = 'critical'): EvidenceMatrixItem[] {
  return [
    { requirementId: 'r1', requirementDescription: 'Experiência com trade marketing', category: 'Functional', importance, evidenceFound: '', evidenceType, evidenceStrength: 'high', sourceIds: [] } as any,
    { requirementId: 'r2', requirementDescription: 'Gestão de PDV', category: 'Functional', importance: 'high', evidenceFound: '', evidenceType: 'direct', evidenceStrength: 'high', sourceIds: [] } as any,
  ];
}

function analysisFrom(m: EvidenceMatrixItem[]): FitAnalysis {
  return { evidenceMatrix: m, dimensions: computeFitScores(m).dimensions } as any;
}

export async function runJobSearchTests(): Promise<void> {
  console.log('  [TEST SUITE] Prompt-driven job search');

  // --- Plan sanitizing ---
  const plan = sanitizePlan({
    terms: ['Trade Marketing', 'trade  marketing', '', 'x'.repeat(200)],
    locations: [],
    postedWithinDays: 99,
    targetResults: 3,
    analyzeTop: 40,
    preferredSeniority: ['Pleno', 'Chefão'] as any,
  } as any);
  assert.deepStrictEqual(plan.terms, ['Trade Marketing'], 'Terms are trimmed, deduplicated and bounded');
  assert.strictEqual(plan.locations[0].linkedinLocation, 'Brasil', 'No location → Brasil');
  assert.strictEqual(plan.postedWithinDays, 30);
  assert.strictEqual(plan.targetResults, 5);
  assert.ok(plan.analyzeTop <= plan.targetResults, 'analyzeTop never exceeds targetResults');
  assert.deepStrictEqual(plan.preferredSeniority, ['Pleno'], 'Unknown seniority levels are dropped');
  const fromDraft = planFromDraft({ ...plan, terms: ['CRM'], suggestedTerms: ['Customer Marketing', 'crm'] } as any);
  assert.deepStrictEqual(fromDraft.plan.terms, ['CRM', 'Customer Marketing']);
  assert.deepStrictEqual(fromDraft.suggestedTerms, ['Customer Marketing'], 'Suggested terms are marked, duplicates dropped');
  console.log('    ✓ Plan is sanitized and suggested terms are marked');

  // --- Pure helpers ---
  assert.strictEqual(titleExclusion('Estagiária de Marketing', ['estagiaria']), 'estagiaria', 'Accent-insensitive title rule');
  assert.strictEqual(titleExclusion('Analista de Assistência Técnica', ['assistente']), null, 'Whole words only');
  assert.strictEqual(titleRelevance('Analista Contábil Júnior', ['Analista de Marketing']), 0, 'Generic words do not make a match');
  assert.strictEqual(titleRelevance('FARM | Analista de CRM I', ['Analista de CRM', 'Trade Marketing']), 1);
  assert.ok(textSimilarity(TRADE_TEXT, TRADE_TEXT + ' Venha!') > 0.8, 'Same text reads as repost');
  assert.ok(textSimilarity(TRADE_TEXT, 'Vaga de engenheiro de dados com Spark, Airflow e dbt para pipelines em nuvem.') < 0.2);
  console.log('    ✓ Title rules and repost similarity');

  // --- Pipeline with fake LinkedIn and fake AI ---
  const card = (id: string, title: string, company: string, location = 'Rio de Janeiro, RJ'): JobCard => ({
    linkedinId: id, title, company, location, url: `https://www.linkedin.com/jobs/view/${id}`, postedAt: '2026-10-10',
  });
  const rioCards = [
    card('1001', 'Analista de Trade Marketing Pleno', 'Vibra'),
    card('1002', 'Estágio em Trade Marketing', 'Bobs'),
    card('1003', 'Analista de Trade Marketing', 'Grupo Arcca'), // same text as 1001
    card('1004', 'Analista de Trade Marketing PcD', 'Haleon'),
    card('1005', 'Analista de Trade Marketing Canal', 'M. Dias Branco'),
    card('1008', 'Analista de Trade', 'Já Salva'),
  ];
  const brCards = [
    card('1006', 'Analista de Trade Marketing', 'Remota Fake', 'Brasil'),
    card('1007', 'Trade Marketing Remoto', 'Remota Real', 'Brasil'),
    card('1001', 'Analista de Trade Marketing Pleno', 'Vibra'),
    card('1009', 'Trade Marketing Coordinator', 'Kidde', 'Mebane, NC'),
    card('1010', 'Analista Contábil Júnior', 'Contábil SA', 'Brasil'),
  ];
  const descriptions: Record<string, string> = {
    '1001': TRADE_TEXT + ' Modelo híbrido, contratação CLT.',
    '1003': TRADE_TEXT + ' Modelo híbrido, contratação CLT. Venha!',
    '1004': 'Vaga exclusiva para pessoas com deficiência. Atuação com trade marketing, PDV e indicadores comerciais no varejo carioca.',
    '1005': 'Trade marketing no canal alimentar, negociação com redes e acompanhamento de execução em loja. Trabalho presencial no Rio de Janeiro.',
    '1006': 'Trade marketing com atuação presencial em São Paulo, visitas a clientes e gestão de promotores na capital paulista.',
    '1007': 'Trade marketing digital para e-commerce. Trabalho 100% remoto, de qualquer lugar do Brasil.',
  };
  const screens: Record<string, Partial<ScreenResult>> = {
    // The second reading overturns this one (the quote exists but does not prove the rule)
    '1001': { workMode: 'Híbrido', workModeQuote: 'Modelo híbrido', contractType: 'CLT', contractQuote: 'contratação CLT', sector: 'Combustíveis', violations: [{ rule: 'inglês avançado obrigatório', quote: 'análise de sell-out' }] },
    '1004': { workMode: 'Não informado', violations: [{ rule: 'vaga exclusiva para PcD', quote: 'Vaga exclusiva para pessoas com deficiência' }] },
    // Violation with an invented quote must not discard; contract claim without a real quote is dropped
    '1005': { workMode: 'Presencial', workModeQuote: 'Trabalho presencial no Rio de Janeiro', contractType: 'PJ', contractQuote: 'contrato PJ', violations: [{ rule: 'inglês avançado obrigatório', quote: 'inglês fluente obrigatório' }] },
    '1006': { workMode: 'Presencial', workModeQuote: 'atuação presencial em São Paulo' },
    '1007': { workMode: 'Remoto', workModeQuote: 'Trabalho 100% remoto' },
  };

  const searched: string[] = [];
  const verified: string[] = [];
  const deps: SearchRunDeps = {
    scraper: {
      requests: 0,
      async searchCards(s) {
        this.requests++;
        searched.push(`${s.keywords}@${s.location}:${s.modes.join('+')}:${s.postedWithinDays}`);
        return s.location === 'Brasil' ? brCards : rioCards;
      },
      async fetchDetail(id): Promise<JobDetail | null> {
        this.requests++;
        const d = descriptions[id];
        return d ? { linkedinId: id, title: '', company: '', location: '', description: d, industries: id === '1001' ? 'Petróleo e gás' : undefined } : null;
      },
    },
    async screen(jobs) {
      return jobs.map((j) => ({
        key: j.key, workMode: 'Não informado', workModeQuote: '', contractType: 'Não informado', contractQuote: '', seniority: 'Não informado', sector: '', violations: [],
        ...screens[j.key],
      })) as ScreenResult[];
    },
    async verify(claims) {
      verified.push(...claims.map((c) => c.rule));
      return claims.map((c) => ({ id: c.id, proves: c.rule.includes('PcD') }));
    },
    ai: {
      async parseJob(rawText) {
        return { requirements: [], rawText } as any;
      },
      async analyzeFit(_lake, job) {
        return analysisFrom(job.title.includes('Canal') ? matrix('gap') : matrix('direct')) as any;
      },
    },
    log: async () => {},
  };

  const runPlan = sanitizePlan({
    terms: ['Trade Marketing'],
    locations: [
      { label: 'Rio', linkedinLocation: 'Rio de Janeiro, Brasil', modes: ['Hybrid', 'On-site'] },
      { label: 'Brasil (remoto)', linkedinLocation: 'Brasil', modes: ['Remote'] },
    ],
    postedWithinDays: 14,
    targetResults: 20,
    analyzeTop: 10,
    excludeTitleTerms: ['estágio'],
    excludeRules: ['vaga exclusiva para PcD', 'inglês avançado obrigatório'],
    preferredSeniority: ['Pleno'],
    preferredSectors: ['combustíveis'],
  } as any);
  const existing = [{ id: 'job_saved', company: 'Já Salva', title: 'Analista de Trade', location: 'Rio de Janeiro, RJ', url: 'https://www.linkedin.com/jobs/view/1008' } as Job];

  const out = await runPlanSearch(runPlan, LAKE, existing, deps);
  const keptIds = out.items.map((i) => i.job.searchMeta?.linkedinId);
  const reason = (company: string) => out.discarded.find((d) => d.company === company)?.reason || '';

  assert.deepStrictEqual(searched, ['Trade Marketing@Rio de Janeiro, Brasil:Hybrid+On-site:14', 'Trade Marketing@Brasil:Remote:14'], 'One search per term × location with its modes and age');
  assert.deepStrictEqual([...keptIds].sort(), ['1001', '1005', '1007'], `Kept jobs, got ${keptIds}`);
  assert.ok(reason('Bobs').includes('estágio'), 'Title rule discards');
  assert.ok(reason('Grupo Arcca').includes('repostagem'), 'Same text is a repost');
  assert.ok(reason('Haleon').includes('PcD'), 'Rule with a real quote discards');
  assert.ok(reason('Remota Fake').includes('remota'), 'Remote search requires remote in the text');
  assert.ok(reason('Kidde').includes('Fora do Brasil'), 'Foreign card discarded before opening');
  assert.ok(reason('Contábil SA').includes('fora da área'), 'Off-topic title discarded');
  assert.deepStrictEqual(verified.sort(), ['inglês avançado obrigatório', 'vaga exclusiva para PcD'], 'Only quoted claims reach the second reading');
  assert.strictEqual(out.stats.rulesOverturned, 1, 'A claim the second reading rejects does not discard');
  assert.strictEqual(out.stats.duplicates, 1, 'Same job id across searches counted once');
  assert.deepStrictEqual(out.alreadySavedJobIds, ['job_saved'], 'Jobs already saved are not saved again');
  const canal = out.items.find((i) => i.job.searchMeta?.linkedinId === '1005')!;
  assert.strictEqual(canal.job.searchMeta?.contractType, 'Não informado', 'Contract claim without a real quote is dropped');
  assert.strictEqual(canal.job.searchMeta?.workMode, 'Presencial');
  const vibra = out.items.find((i) => i.job.searchMeta?.linkedinId === '1001')!;
  assert.strictEqual(vibra.job.employmentType, 'CLT');
  assert.ok(vibra.job.searchMeta?.matchedTerms?.length, 'Matched terms recorded');
  assert.strictEqual(out.items[0].job.searchMeta?.linkedinId === '1005', false, 'Job with a critical gap is not ranked first');
  console.log('    ✓ Pipeline: title rules, reposts, quoted rules, remote check, dedupe, already-saved');

  // --- Recommendation ---
  assert.strictEqual(recommend(analysisFrom(matrix('direct'))).verdict, 'Sim');
  assert.strictEqual(recommend(analysisFrom(matrix('gap'))).verdict, 'Não', 'Critical gap → do not apply');
  assert.strictEqual(recommend(null).verdict, 'Talvez');
  console.log('    ✓ "Vale a pena?" is derived from score and critical gaps');
}
