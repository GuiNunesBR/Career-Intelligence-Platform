import React, { useEffect, useMemo, useState } from 'react';
import { BackgroundJob } from '../shared/types.js';
import {
  Search, Sparkles, Play, Save, X, Plus, ExternalLink, FileText, Download, Briefcase, ChevronDown, ChevronRight, Trash2, MapPin,
} from 'lucide-react';
import { api, SavedSearch, SearchRunDetail, SearchRunItem, SearchRunSummary } from '../lib/api.js';
import {
  DEFAULT_PLAN, PLAN_LIMITS, SENIORITY_LEVELS, WORK_MODES, WORK_MODE_LABEL,
  fitHighlights, recommend, type SearchPlan, type SeniorityLevel,
} from '../shared/searchPlan.js';
import { fitBand } from '../shared/fitScore.js';

interface JobSearchViewProps {
  jobs: BackgroundJob[];
  onTriggerJob: (jobType: string, payload?: any) => Promise<void>;
  onRefresh: () => void;
  userId: string;
  onNavigate: (tab: string, jobId?: string) => void;
  onSaveAsApplication: (jobId: string) => void;
}

const PROMPT_PLACEHOLDER = `Ex.: Vagas dos últimos 14 dias de "Analista de Trade Marketing", "Analista de CRM" e "Analista de Eventos" (se achar outros termos que façam sentido para o perfil, pode adicionar).
Locais: Rio de Janeiro híbrido e presencial (inclua Niterói e Grande Rio); Brasil remoto (confira no texto se é remoto de verdade).
Traga pelo menos 20 vagas únicas. Descarte estágio, assistente, vagas exclusivas para PcD, inglês avançado obrigatório e presencial fora do Rio. Vagas afirmativas para mulheres valem.
Abra as 10 mais promissoras. Priorize pleno/especialista e os setores de energia, bens de consumo e farma.`;

const VERDICT_STYLE = {
  Sim: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Talvez: 'bg-amber-50 text-amber-700 border-amber-200',
  Não: 'bg-rose-50 text-rose-700 border-rose-200',
} as const;

const inputCls = 'w-full border border-neutral-300 rounded px-2 py-1.5 text-xs bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none';

/** Editable list of short strings shown as chips. */
const ChipList: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  highlight?: string[];
  max?: number;
}> = ({ values, onChange, placeholder, highlight = [], max = 20 }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v) && values.length < max) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {values.map((v) => (
        <span
          key={v}
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${
            highlight.includes(v) ? 'bg-violet-50 border-violet-200 text-violet-800' : 'bg-neutral-100 border-neutral-200 text-neutral-800'
          }`}
          title={highlight.includes(v) ? 'Sugerido a partir do seu perfil' : undefined}
        >
          {highlight.includes(v) && <Sparkles className="w-3 h-3" />}
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-neutral-400 hover:text-rose-600" aria-label={`Remover ${v}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {values.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          className="flex-1 min-w-[140px] border border-dashed border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-neutral-500"
        />
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div className="text-[11px] font-bold text-neutral-700 mb-1">
      {label} {hint && <span className="font-normal text-neutral-400">· {hint}</span>}
    </div>
    {children}
  </div>
);

const PlanEditor: React.FC<{ plan: SearchPlan; suggested: string[]; onChange: (plan: SearchPlan) => void }> = ({ plan, suggested, onChange }) => {
  const set = <K extends keyof SearchPlan>(key: K, value: SearchPlan[K]) => onChange({ ...plan, [key]: value });
  const setLocation = (idx: number, patch: Partial<SearchPlan['locations'][number]>) =>
    set('locations', plan.locations.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const searches = plan.terms.length * plan.locations.length;

  return (
    <div className="space-y-4">
      <Field label="Termos de busca" hint={`${plan.terms.length}/${PLAN_LIMITS.terms}`}>
        <ChipList values={plan.terms} onChange={(v) => set('terms', v)} placeholder="Adicionar termo…" highlight={suggested} max={PLAN_LIMITS.terms} />
      </Field>

      <Field label="Locais" hint="modalidades aceitas em cada local">
        <div className="space-y-2">
          {plan.locations.map((loc, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 md:items-center border border-neutral-200 rounded p-2">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 hidden md:block" />
              <input className={`${inputCls} md:w-48`} value={loc.label} onChange={(e) => setLocation(idx, { label: e.target.value })} placeholder="Nome (ex.: Rio e Grande Rio)" />
              <input className={`${inputCls} md:w-56`} value={loc.linkedinLocation} onChange={(e) => setLocation(idx, { linkedinLocation: e.target.value })} placeholder="Local no LinkedIn (ex.: Rio de Janeiro, Brasil)" />
              <div className="flex gap-1">
                {WORK_MODES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setLocation(idx, { modes: loc.modes.includes(m) ? loc.modes.filter((x) => x !== m) : [...loc.modes, m] })}
                    className={`px-2 py-1 rounded border text-[11px] ${loc.modes.includes(m) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300 text-neutral-600'}`}
                  >
                    {WORK_MODE_LABEL[m]}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-neutral-400 md:ml-auto">
                {loc.modes.length === 1 && loc.modes[0] === 'Remote' ? 'remoto confirmado no texto' : loc.modes.length ? '' : 'qualquer modalidade'}
              </span>
              {plan.locations.length > 1 && (
                <button onClick={() => set('locations', plan.locations.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-rose-600" aria-label="Remover local">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {plan.locations.length < PLAN_LIMITS.locations && (
            <button
              onClick={() => set('locations', [...plan.locations, { label: '', linkedinLocation: '', modes: [] }])}
              className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar local
            </button>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Publicadas nos últimos">
          <select className={inputCls} value={plan.postedWithinDays} onChange={(e) => set('postedWithinDays', Number(e.target.value))}>
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>{d === 1 ? '1 dia' : `${d} dias`}</option>
            ))}
          </select>
        </Field>
        <Field label="Vagas únicas (meta)">
          <input type="number" min={5} max={PLAN_LIMITS.maxTarget} className={inputCls} value={plan.targetResults} onChange={(e) => set('targetResults', Number(e.target.value))} />
        </Field>
        <Field label="Analisar em detalhe">
          <input type="number" min={1} max={PLAN_LIMITS.maxAnalyze} className={inputCls} value={plan.analyzeTop} onChange={(e) => set('analyzeTop', Number(e.target.value))} />
        </Field>
        <Field label="Buscas no LinkedIn">
          <div className={`${inputCls} bg-neutral-50 text-neutral-600`}>{searches} ({plan.terms.length} × {plan.locations.length})</div>
        </Field>
      </div>

      <Field label="Descartar se o título tiver">
        <ChipList values={plan.excludeTitleTerms} onChange={(v) => set('excludeTitleTerms', v)} placeholder="Ex.: estágio" />
      </Field>
      <Field label="Descartar se o texto da vaga" hint="a IA precisa citar o trecho que comprova">
        <ChipList values={plan.excludeRules} onChange={(v) => set('excludeRules', v)} placeholder="Ex.: inglês avançado obrigatório" max={10} />
      </Field>
      <Field label="Exceções (nunca descartar por isso)">
        <ChipList values={plan.allowNotes} onChange={(v) => set('allowNotes', v)} placeholder="Ex.: vagas afirmativas para mulheres valem" max={5} />
      </Field>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Priorizar nível">
          <div className="flex flex-wrap gap-1">
            {SENIORITY_LEVELS.map((s) => (
              <button
                key={s}
                onClick={() =>
                  set('preferredSeniority', plan.preferredSeniority.includes(s) ? plan.preferredSeniority.filter((x) => x !== s) : [...plan.preferredSeniority, s as SeniorityLevel])
                }
                className={`px-2 py-1 rounded border text-[11px] ${plan.preferredSeniority.includes(s) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300 text-neutral-600'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Priorizar setores">
          <ChipList values={plan.preferredSectors} onChange={(v) => set('preferredSectors', v)} placeholder="Ex.: farma" max={8} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-700">
        <input type="checkbox" checked={plan.autoTailorCv} onChange={(e) => set('autoTailorCv', e.target.checked)} />
        Gerar CV ATS automaticamente para as vagas recomendadas (até {PLAN_LIMITS.maxAutoCv})
      </label>
    </div>
  );
};

async function downloadCv(jobId: string) {
  const { blob, fileName } = await api.downloadCvPdf(jobId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const ResultRow: React.FC<{ item: SearchRunItem; idx: number; onNavigate: JobSearchViewProps['onNavigate'] }> = ({ item, idx, onNavigate }) => {
  const { job, analysis, hasCv } = item;
  const rec = recommend(analysis);
  const hl = fitHighlights(analysis, 2);
  const meta = job.searchMeta || {};
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <tr className="border-t border-neutral-100 align-top">
      <td className="py-3 pr-2 text-xs text-neutral-400">{idx + 1}</td>
      <td className="py-3 pr-3 min-w-[180px]">
        <a href={job.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline inline-flex items-start gap-1">
          {job.title} <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0" />
        </a>
        <div className="text-[11px] text-neutral-500 mt-0.5">
          {[meta.postedAt && `publicada ${new Date(meta.postedAt + 'T12:00:00').toLocaleDateString('pt-BR')}`, meta.applicants].filter(Boolean).join(' · ')}
        </div>
      </td>
      <td className="py-3 pr-3 text-xs text-neutral-700 min-w-[160px]">
        <div className="font-semibold">{job.company}</div>
        <div title={meta.workModeQuote ? `“${meta.workModeQuote}”` : undefined}>
          {job.location}
          {meta.workMode && meta.workMode !== 'Não informado' ? ` · ${meta.workMode}` : ' · modalidade não informada'}
        </div>
        <div className="text-neutral-500" title={meta.contractQuote ? `“${meta.contractQuote}”` : undefined}>
          {meta.contractType && meta.contractType !== 'Não informado' ? meta.contractType : 'Contrato não informado'}
          {meta.sector ? ` · ${meta.sector}` : ''}
        </div>
      </td>
      <td className="py-3 pr-3 text-center">
        {rec.score !== null ? (
          <div>
            <div className="text-lg font-bold text-neutral-900">{rec.score}%</div>
            <div className="text-[10px] text-neutral-500">{fitBand(rec.score)}</div>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">—</span>
        )}
      </td>
      <td className="py-3 pr-3 text-[11px] leading-snug min-w-[200px]">
        {hl.matches.map((m) => (
          <p key={m} className="text-emerald-700">✓ {m}</p>
        ))}
        {hl.gaps.map((g) => (
          <p key={g} className="text-rose-700">✕ {g}</p>
        ))}
        {!analysis && <p className="text-neutral-400">Sem análise de fit — use "Analisar".</p>}
      </td>
      <td className="py-3 pr-3 min-w-[140px]">
        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${VERDICT_STYLE[rec.verdict]}`}>{rec.verdict}</span>
        <p className="text-[10px] text-neutral-500 mt-1 leading-snug">{rec.reason}</p>
      </td>
      <td className="py-3 text-right">
        <div className="flex flex-col gap-1 items-end">
          {hasCv ? (
            <button
              onClick={async () => {
                setDownloading(true);
                setError(null);
                try {
                  await downloadCv(job.id);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className="text-[11px] font-semibold px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Download className="w-3 h-3" /> {downloading ? 'Gerando…' : 'CV (PDF)'}
            </button>
          ) : (
            <button onClick={() => onNavigate('tailoring', job.id)} className="text-[11px] font-semibold px-2 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800 inline-flex items-center gap-1">
              <FileText className="w-3 h-3" /> Gerar CV
            </button>
          )}
          <button onClick={() => onNavigate('fit_analysis', job.id)} className="text-[11px] font-semibold px-2 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> {analysis ? 'Análise' : 'Analisar'}
          </button>
          {error && <span className="text-[10px] text-rose-600 max-w-[140px]">{error}</span>}
        </div>
      </td>
    </tr>
  );
};

function runSummary(detail: SearchRunDetail): string {
  const s = detail.run.stats;
  if (!s) return '';
  const parts = [
    `${s.searches} buscas no LinkedIn, ${s.cardsFound} resultados, ${s.uniqueCards} sem duplicadas`,
    `abri ${s.opened}`,
    `${s.passed} passaram nos filtros`,
  ];
  if (s.reposts) parts.push(`${s.reposts} repostagens unificadas`);
  if (s.foreign) parts.push(`${s.foreign} fora do Brasil`);
  if (s.alreadySaved) parts.push(`${s.alreadySaved} já estavam salvas`);
  if (s.analyzed) parts.push(`${s.analyzed} com fit analisado`);
  if (s.cvsGenerated) parts.push(`${s.cvsGenerated} CVs gerados`);
  return parts.join(' · ') + '.';
}

export const JobSearchView: React.FC<JobSearchViewProps> = ({ jobs, onRefresh, onNavigate }) => {
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<SearchPlan | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [runs, setRuns] = useState<SearchRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchRunDetail | null>(null);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [showAlreadySaved, setShowAlreadySaved] = useState(false);

  const activeRun = (jobs || []).find((j) => j.jobType === 'job_search_agent' && (j.status === 'running' || j.status === 'queued'));

  const loadRuns = async (selectLatest = false) => {
    try {
      const { runs } = await api.getSearchRuns();
      setRuns(runs);
      if ((selectLatest || !selectedRunId) && runs[0]) setSelectedRunId(runs[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSaved = async () => {
    try {
      const { agents } = await api.getSearchAgents();
      setSaved(agents.filter((a) => a.plan));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRuns(true);
    loadSaved();
  }, []);

  // A run finished (or started): refresh the list and its detail
  useEffect(() => {
    loadRuns(!!activeRun);
  }, [activeRun?.id, activeRun?.status]);

  useEffect(() => {
    if (!selectedRunId) return;
    let cancelled = false;
    api
      .getSearchRun(selectedRunId)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, activeRun?.progress, activeRun?.status]);

  const handlePlan = async () => {
    setIsPlanning(true);
    setError(null);
    try {
      const res = await api.planJobSearch(prompt);
      setPlan(res.plan);
      setSuggested(res.suggestedTerms);
    } catch (e: any) {
      setError(e.message || 'Não foi possível montar o plano.');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleRun = async (runPlan: SearchPlan, runPrompt?: string) => {
    setIsStarting(true);
    setError(null);
    try {
      const { backgroundJob } = await api.runJobSearch(runPlan, runPrompt);
      setSelectedRunId(backgroundJob.id);
      onRefresh();
    } catch (e: any) {
      setError(e.message || 'Não foi possível iniciar a busca.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    const name = window.prompt('Nome desta busca:', plan.terms.slice(0, 2).join(', '));
    if (!name) return;
    try {
      await api.createSearchAgent({ name, prompt, plan });
      await loadSaved();
    } catch (e: any) {
      setError(e.message || 'Não foi possível salvar a busca.');
    }
  };

  const selectedIsActive = activeRun && detail?.run.id === activeRun.id;
  const lastLogs = useMemo(
    () => (selectedIsActive ? activeRun!.logs : detail?.run.logs || []).slice(-5).map((l) => l.replace(/^\[[^\]]+\]\s*/, '')),
    [selectedIsActive, activeRun, detail]
  );

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Search className="w-4 h-4" /> Busca via prompt
          </h2>
          <span className="text-[11px] text-neutral-400">Vagas públicas do LinkedIn · uso pessoal e em baixo volume</span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PROMPT_PLACEHOLDER}
          rows={6}
          className="w-full border border-neutral-300 rounded p-3 text-sm focus:ring-1 focus:ring-neutral-900 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={handlePlan}
            disabled={isPlanning || prompt.trim().length < 5}
            className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> {isPlanning ? 'Montando plano…' : 'Montar plano'}
          </button>
          <button
            onClick={() => {
              setPlan({ ...DEFAULT_PLAN, locations: DEFAULT_PLAN.locations.map((l) => ({ ...l })) });
              setSuggested([]);
            }}
            className="px-3 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Montar manualmente
          </button>
          {saved.length > 0 && <span className="text-[11px] text-neutral-400 ml-2">Buscas salvas:</span>}
          {saved.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 border border-neutral-200 rounded text-[11px] bg-neutral-50">
              <button
                onClick={() => {
                  setPlan(s.plan!);
                  setPrompt(s.prompt || '');
                  setSuggested([]);
                }}
                className="px-2 py-1 font-semibold text-neutral-800 hover:text-neutral-950"
                title="Carregar no editor"
              >
                {s.name}
              </button>
              <button onClick={() => handleRun(s.plan!, s.prompt || undefined)} disabled={!!activeRun} className="px-1 text-emerald-700 hover:text-emerald-900 disabled:opacity-40" title="Rodar agora">
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={async () => {
                  await api.deleteSearchAgent(s.id);
                  loadSaved();
                }}
                className="px-1 text-neutral-400 hover:text-rose-600"
                title="Excluir"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>

      {/* Plan */}
      {plan && (
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-neutral-900 mb-4">Plano da busca <span className="font-normal text-neutral-400 text-xs">· revise e ajuste antes de rodar</span></h2>
          <PlanEditor plan={plan} suggested={suggested} onChange={setPlan} />
          <div className="flex gap-2 mt-5 pt-4 border-t border-neutral-100">
            <button
              onClick={() => handleRun(plan, prompt || undefined)}
              disabled={isStarting || !!activeRun || !plan.terms.length}
              className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> {activeRun ? 'Busca em andamento…' : isStarting ? 'Iniciando…' : 'Buscar vagas'}
            </button>
            <button onClick={handleSave} disabled={!plan.terms.length} className="px-3 py-2 border border-neutral-300 rounded text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Salvar busca
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Resultado da busca</h2>
          {runs.length > 0 && (
            <select className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white max-w-[360px]" value={selectedRunId || ''} onChange={(e) => setSelectedRunId(e.target.value)}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.createdAt.includes('T') ? r.createdAt : r.createdAt.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {r.terms.slice(0, 3).join(', ')}
                  {r.status === 'failed' ? ' (falhou)' : r.status === 'running' || r.status === 'queued' ? ' (rodando)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {!detail ? (
          <p className="text-sm text-neutral-500 py-8 text-center">Nenhuma busca ainda. Descreva o que procura acima e monte o plano.</p>
        ) : (
          <>
            {detail.run.prompt && <p className="text-[11px] text-neutral-500 mb-2 line-clamp-2" title={detail.run.prompt}>Pedido: {detail.run.prompt}</p>}

            {(detail.run.status === 'running' || detail.run.status === 'queued') && (
              <div className="border border-blue-200 bg-blue-50 rounded p-3 mb-3">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-2">
                  <span>Buscando… costuma levar de 2 a 5 minutos</span>
                  <span>{selectedIsActive ? activeRun!.progress : detail.run.progress}%</span>
                </div>
                <div className="h-1.5 bg-blue-100 rounded overflow-hidden mb-2">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${selectedIsActive ? activeRun!.progress : detail.run.progress}%` }} />
                </div>
                {lastLogs.map((l, i) => (
                  <p key={i} className="text-[11px] text-blue-800 truncate">{l}</p>
                ))}
              </div>
            )}

            {detail.run.status === 'failed' && (
              <div className="border border-rose-200 bg-rose-50 rounded p-3 mb-3 text-xs text-rose-800">
                A busca falhou. {lastLogs.filter((l) => l.includes('ERROR')).slice(-1)[0]?.replace('ERROR:', '').trim()}
              </div>
            )}

            {detail.run.stats && <p className="text-xs text-neutral-600 mb-3">{runSummary(detail)}</p>}

            {detail.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-neutral-400">
                      <th className="pb-2 pr-2">#</th>
                      <th className="pb-2 pr-3">Vaga</th>
                      <th className="pb-2 pr-3">Empresa · modalidade · contrato</th>
                      <th className="pb-2 pr-3 text-center">Match</th>
                      <th className="pb-2 pr-3">O que bate · gaps reais</th>
                      <th className="pb-2 pr-3">Vale a pena?</th>
                      <th className="pb-2 text-right">CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, idx) => (
                      <ResultRow key={item.job.id} item={item} idx={idx} onNavigate={onNavigate} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {detail.alreadySaved.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowAlreadySaved(!showAlreadySaved)} className="text-xs font-semibold text-neutral-600 inline-flex items-center gap-1">
                  {showAlreadySaved ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Já estavam salvas ({detail.alreadySaved.length})
                </button>
                {showAlreadySaved && (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left">
                      <tbody>
                        {detail.alreadySaved.map((item, idx) => (
                          <ResultRow key={item.job.id} item={item} idx={idx} onNavigate={onNavigate} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {detail.run.discarded.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowDiscarded(!showDiscarded)} className="text-xs font-semibold text-neutral-600 inline-flex items-center gap-1">
                  {showDiscarded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Descartadas ({detail.run.discarded.length})
                </button>
                {showDiscarded && (
                  <ul className="mt-2 space-y-1">
                    {detail.run.discarded.map((d, i) => (
                      <li key={i} className="text-[11px] text-neutral-600">
                        <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-neutral-800 hover:underline">{d.title}</a>
                        {d.company && ` · ${d.company}`} — <span className="text-neutral-500">{d.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
