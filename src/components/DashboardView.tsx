import React from 'react';
import { User, UserCareerLake, Job, Application, BackgroundJob } from '../shared/types.js';
import {
  Database,
  Briefcase,
  Layers,
  FileCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  lake: UserCareerLake;
  jobs: Job[];
  applications: Application[];
  backgroundJobs: BackgroundJob[];
  onNavigate: (tab: string, jobId?: string) => void;
  onRunAudit: () => void;
  onTriggerNightWorker: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  lake,
  jobs,
  applications,
  backgroundJobs,
  onNavigate,
  onRunAudit,
  onTriggerNightWorker,
}) => {
  const directEvidences = lake.evidences.filter((e) => e.type === 'direct').length;
  const transferableEvidences = lake.evidences.filter((e) => e.type === 'transferable').length;
  const metricsCount = lake.evidences.filter((e) => Boolean(e.metric)).length;

  const activeApps = applications.filter(
    (a) => a.status !== 'Rejected' && a.status !== 'Withdrawn'
  );
  const interviewApps = applications.filter(
    (a) => a.status === 'Interview' || a.status === 'Technical Stage' || a.status === 'Final Stage'
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>Sessão ativa</span>
              <span aria-hidden="true">·</span>
              <span>{user.email}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-neutral-700">user_id: {user.id}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {user.name} — Painel de Inteligência de Carreira
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-3xl">
              O Career Lake é a fonte única de verdade do seu histórico. Vagas analisadas, matrizes de evidência e CVs direcionados são gerados estritamente a partir dos fatos auditados da sua carreira.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('analyzer')}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              + Analisar Nova Vaga
            </button>
            <button
              onClick={onRunAudit}
              className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors whitespace-nowrap"
            >
              Auditar Evidências
            </button>
          </div>
        </div>
      </div>

      {/* Core Quantitative Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Evidências Auditadas</span>
            <Database className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono tabular-nums">
            {lake.evidences.length}
          </p>
          <div className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
            <span>{directEvidences} diretas</span>
            <span aria-hidden="true">·</span>
            <span>{metricsCount} com métricas</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Vagas Analisadas</span>
            <Briefcase className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono tabular-nums">
            {jobs.length}
          </p>
          <div className="text-xs text-neutral-500 mt-2">
            <span>Mapeadas via Evidence Matrix</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Pipeline de Candidaturas</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono tabular-nums">
            {applications.length}
          </p>
          <div className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
            <span>{activeApps.length} ativas</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">{interviewApps.length} em entrevistas</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Background Worker</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2 font-mono tabular-nums">
            {backgroundJobs.length}
          </p>
          <div className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Fila assíncrona ativa</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Career Lake Source of Truth & Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Career Lake Health & Evidence Foundation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Career Lake — Repositório Estruturado</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  A base de dados profissional que alimenta todas as análises e documentos
                </p>
              </div>
              <button
                onClick={() => onNavigate('lake')}
                className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1"
              >
                Gerenciar Lake <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 text-xs">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <span className="text-neutral-500">Experiências Registradas</span>
                <p className="text-lg font-bold text-neutral-900 mt-1 font-mono tabular-nums">
                  {lake.experiences.length}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Empresas e cargos estruturados</p>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <span className="text-neutral-500">Projetos & Escopos</span>
                <p className="text-lg font-bold text-neutral-900 mt-1 font-mono tabular-nums">
                  {lake.projects.length}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Com métricas e escopo definidos</p>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                <span className="text-neutral-500">Competências Mapeadas</span>
                <p className="text-lg font-bold text-neutral-900 mt-1 font-mono tabular-nums">
                  {lake.skills.length}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Categorizadas por proficiência</p>
              </div>
            </div>

            {/* Evidence Quality Breakdown */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                Distribuição de Força Probatória
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-neutral-600 mb-1">
                    <span>Evidências Diretas com Métricas Auditáveis</span>
                    <span className="font-mono tabular-nums font-medium">{directEvidences} de {lake.evidences.length}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full"
                      style={{ width: `${Math.round((directEvidences / Math.max(1, lake.evidences.length)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-600 mb-1">
                    <span>Competências Transferíveis de Governança</span>
                    <span className="font-mono tabular-nums font-medium">{transferableEvidences} de {lake.evidences.length}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-neutral-500 h-full"
                      style={{ width: `${Math.round((transferableEvidences / Math.max(1, lake.evidences.length)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analyzed Opportunities */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Vagas Analisadas & Fit</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Comparações baseadas na matriz de evidências (sem alucinações de competência)
                </p>
              </div>
              <button
                onClick={() => onNavigate('analyzer')}
                className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1"
              >
                + Nova Vaga <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                <p>Nenhuma vaga cadastrada neste perfil ainda.</p>
                <button
                  onClick={() => onNavigate('analyzer')}
                  className="mt-3 px-3 py-1.5 text-xs bg-neutral-900 text-white rounded-md font-medium"
                >
                  Colar Descrição de Vaga
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="py-3.5 flex items-center justify-between hover:bg-neutral-50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="max-w-md">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-medium text-neutral-900">{job.company}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.seniority}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.location}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-900 mt-0.5">
                        {job.title}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                        {job.requirements.length} requisitos mapeados na Evidence Matrix
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate('fit_analysis', job.id)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
                      >
                        Ver Matriz de Fit
                      </button>
                      <button
                        onClick={() => onNavigate('tailoring', job.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
                      >
                        Gerar CV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): System Principles, Background Worker & Active Pipeline */}
        <div className="space-y-6">
          {/* Evidence-First Principle Card */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5 text-xs">
            <div className="flex items-center gap-2 text-neutral-900 font-semibold mb-2">
              <ShieldAlert className="w-4 h-4 text-neutral-700" />
              <span>Garantia de Não-Alucinação</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              O Career Lake nunca inventa métricas, não transforma conhecimento indireto em experiência direta, e destaca explicitamente quando há ausência de evidência em domínios específicos.
            </p>
            <div className="mt-3 pt-3 border-t border-neutral-200/60 text-[11px] text-neutral-500 space-y-1">
              <p>• <strong>Evidência Direta:</strong> comprovada no Lake</p>
              <p>• <strong>Transferibilidade:</strong> competência funcional sem domínio direto</p>
              <p>• <strong>Gap Auditado:</strong> ausência de evidência explicitada</p>
            </div>
          </div>

          {/* Background Worker Panel */}
          <div className="bg-white border border-neutral-200 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-semibold text-neutral-900">Background Worker</span>
              <button
                onClick={() => onNavigate('worker')}
                className="text-xs text-neutral-500 hover:text-neutral-900"
              >
                Ver fila
              </button>
            </div>

            <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
              Executa processamento assíncrono de reanálise de vagas e auditoria de evidências de forma isolada por usuário.
            </p>

            <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2">
              <button
                onClick={onTriggerNightWorker}
                className="w-full py-2 px-3 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors text-center"
              >
                Executar Reanálise Noturna das Vagas
              </button>
            </div>
          </div>

          {/* Quick Active Pipeline */}
          <div className="bg-white border border-neutral-200 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-semibold text-neutral-900">Candidaturas em Andamento</span>
              <button
                onClick={() => onNavigate('applications')}
                className="text-xs text-neutral-500 hover:text-neutral-900"
              >
                Abrir pipeline
              </button>
            </div>

            {applications.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">Nenhuma candidatura salva</p>
            ) : (
              <div className="divide-y divide-neutral-100 mt-2">
                {applications.slice(0, 4).map((app) => (
                  <div key={app.id} className="py-2.5 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 truncate max-w-[150px]">{app.jobTitle}</p>
                      <p className="text-neutral-500 truncate max-w-[150px]">{app.company}</p>
                    </div>
                    <span className="font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
