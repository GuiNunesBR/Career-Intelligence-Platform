import React, { useState } from 'react';
import { BackgroundJob, UserAutomation } from '../shared/types.js';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  Terminal,
  ShieldCheck,
  RotateCcw,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Globe,
} from 'lucide-react';

interface BackgroundJobsViewProps {
  jobs: BackgroundJob[];
  automations?: UserAutomation[];
  onTriggerJob: (jobType: string, payload?: any) => Promise<void>;
  onCancelJob?: (jobId: string) => Promise<void>;
  onRetryJob?: (jobId: string) => Promise<void>;
  onToggleAutomation?: (id: string, enabled: boolean) => Promise<void>;
  onTriggerAutomation?: (id: string) => Promise<void>;
  onRefresh: () => void;
  userId: string;
}

export const BackgroundJobsView: React.FC<BackgroundJobsViewProps> = ({
  jobs,
  automations = [],
  onTriggerJob,
  onCancelJob,
  onRetryJob,
  onToggleAutomation,
  onTriggerAutomation,
  onRefresh,
  userId,
}) => {
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async (type: string, payload?: any) => {
    setIsTriggering(true);
    try {
      await onTriggerJob(type, payload);
      onRefresh();
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusBadge = (status: BackgroundJob['status']) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-800 bg-emerald-50 border border-emerald-200';
      case 'running':
        return 'text-blue-800 bg-blue-50 border border-blue-200 animate-pulse';
      case 'queued':
      case 'pending':
        return 'text-amber-800 bg-amber-50 border border-amber-200';
      case 'failed':
        return 'text-rose-800 bg-rose-50 border border-rose-200';
      default:
        return 'text-neutral-700 bg-neutral-100 border border-neutral-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>Background Processing Architecture</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Fila isolada: user_{userId}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Console do Background Worker
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-3xl">
              Processamento em segundo plano desvinculado da aba do navegador. Suporta rotinas noturnas de reanálise de vagas, auditoria automática de evidências e enfileiramento com política de retry e idempotência.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Fila</span>
            </button>
          </div>
        </div>

        {/* Quick Trigger Actions */}
        <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleTrigger('nightly_analysis')}
            disabled={isTriggering}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>Simular Job Noturno (Reanálise em Lote)</span>
          </button>

          <button
            onClick={() => handleTrigger('evidence_audit')}
            disabled={isTriggering}
            className="px-3.5 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Disparar Auditoria de Integridade do Lake</span>
          </button>
        </div>
      </div>

      {/* User Recurring Automations (Scheduler Integration) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-700" />
              <span>Automações Recorrentes Agendadas (Scheduler)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Rotinas configuradas com fuso horário explícito e controle de idempotência determinístico.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500">
            {automations.length} configuradas
          </span>
        </div>

        {automations.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Nenhuma automação cadastrada.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className="p-3.5 rounded border border-neutral-200 bg-neutral-50/50 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-neutral-900 uppercase text-[11px]">
                    {auto.type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onToggleAutomation && (
                      <button
                        onClick={() => onToggleAutomation(auto.id, !auto.enabled)}
                        className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                          auto.enabled
                            ? 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200'
                            : 'text-neutral-500 bg-neutral-200 hover:bg-neutral-300'
                        }`}
                      >
                        {auto.enabled ? (
                          <>
                            <ToggleRight className="w-3.5 h-3.5" />
                            <span>Ativa</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-3.5 h-3.5" />
                            <span>Inativa</span>
                          </>
                        )}
                      </button>
                    )}
                    {onTriggerAutomation && auto.enabled && (
                      <button
                        onClick={() => onTriggerAutomation(auto.id)}
                        className="px-2 py-0.5 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800 flex items-center gap-1 text-[11px]"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>Disparar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-neutral-600 text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>{auto.schedule.frequency.toUpperCase()} às {auto.schedule.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-neutral-400" />
                    <span>{auto.schedule.timezone}</span>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-200/60 font-mono">
                  <span>Próxima execução: {new Date(auto.nextRunAt).toLocaleString()}</span>
                  {auto.lastRunAt && (
                    <span>Última: {new Date(auto.lastRunAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jobs Queue Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Histórico de Jobs do Usuário</h2>
          <span className="text-xs font-mono text-neutral-500 tabular-nums">
            {jobs.length} jobs registrados
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-10 text-center text-xs text-neutral-500">
            <p>Nenhum job em background registrado para este usuário ainda.</p>
            <button
              onClick={() => handleTrigger('nightly_analysis')}
              className="mt-3 px-3 py-1.5 bg-neutral-900 text-white rounded font-medium"
            >
              Disparar Primeiro Job
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Job ID & Tipo</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Progresso</th>
                <th className="py-2.5 px-4">Criado em</th>
                <th className="py-2.5 px-4">Conclusão</th>
                <th className="py-2.5 px-4 text-right">Logs & Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-neutral-900 font-mono">{job.jobType}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">{job.id}</p>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusBadge(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="w-28 space-y-1">
                      <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${job.status === 'completed' ? 'bg-emerald-600' : 'bg-neutral-900'}`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                        {job.progress}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-neutral-500">
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </td>

                  <td className="py-3 px-4 font-mono text-neutral-500">
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleTimeString() : '—'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(job.status === 'queued' || job.status === 'running') && onCancelJob && (
                        <button
                          onClick={() => onCancelJob(job.id)}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-medium px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-50"
                        >
                          Cancelar
                        </button>
                      )}
                      {(job.status === 'failed' || job.status === 'cancelled') && onRetryJob && (
                        <button
                          onClick={() => onRetryJob(job.id)}
                          className="text-[11px] text-neutral-700 hover:text-neutral-900 font-medium px-2 py-0.5 rounded border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-neutral-900 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Logs ({job.logs.length})</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: JOB LOGS & RESULT */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-100">
              <div>
                <p className="text-[11px] font-mono text-neutral-400">ID: {selectedJob.id}</p>
                <h3 className="text-base font-bold text-neutral-900">Job: {selectedJob.jobType}</h3>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-neutral-400 hover:text-neutral-700 text-sm">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-50 rounded border border-neutral-200 font-mono text-[11px]">
              <div>
                <span className="text-neutral-400 block">Status:</span>
                <span className="font-semibold text-neutral-800">{selectedJob.status.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Retries:</span>
                <span className="font-semibold text-neutral-800">{selectedJob.retryCount}/3</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Progresso:</span>
                <span className="font-semibold text-neutral-800">{selectedJob.progress}%</span>
              </div>
            </div>

            {/* Logs console */}
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Execution Logs</label>
              <div className="p-3 bg-neutral-900 text-neutral-200 rounded font-mono text-[11px] h-48 overflow-y-auto space-y-1">
                {selectedJob.logs.map((log, idx) => (
                  <p key={idx} className="leading-snug">
                    {log}
                  </p>
                ))}
              </div>
            </div>

            {/* Result Object */}
            {selectedJob.result && (
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Result Payload</label>
                <pre className="p-2.5 bg-neutral-50 border border-neutral-200 rounded text-[11px] font-mono overflow-x-auto text-neutral-700 max-h-32">
                  {JSON.stringify(selectedJob.result, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-neutral-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-1.5 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
