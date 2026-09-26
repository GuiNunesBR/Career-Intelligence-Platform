import React, { useState } from 'react';
import { Application, ApplicationStatus } from '../shared/types.js';
import {
  DollarSign,
  Trash2,
  } from 'lucide-react';

interface ApplicationsViewProps {
  applications: Application[];
  onUpdateStatus: (id: string, status: ApplicationStatus, note?: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onNavigateToAnalysis: (jobId: string) => void;
  onNavigateToTailoring: (jobId: string) => void;
}

const STAGES: ApplicationStatus[] = [
  'Saved',
  'Ready to Apply',
  'Applied',
  'Recruiter Contact',
  'Interview',
  'Technical Stage',
  'Final Stage',
  'Offer',
  'Rejected',
];

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onUpdateStatus,
  onDeleteApplication,
  onNavigateToAnalysis,
  onNavigateToTailoring,
}) => {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [newStatusNote, setNewStatusNote] = useState('');

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    await onUpdateStatus(appId, newStatus, newStatusNote || undefined);
    setNewStatusNote('');
    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp({
        ...selectedApp,
        status: newStatus,
        timeline: [
          ...selectedApp.timeline,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: newStatusNote || `Movido para ${newStatus}`,
          },
        ],
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>Pipeline Ativo</span>
              <span aria-hidden="true">·</span>
              <span>Rastreamento com Versões de CV Utilizadas</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Candidaturas & Processos Seletivos
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
              Acompanhe o funil de contratação de ponta a ponta, associando cada etapa ao documento direcionado e às anotações da oportunidade.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded text-xs">
              <button
                onClick={() => setViewMode('board')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  viewMode === 'board' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  viewMode === 'list' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
                }`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {viewMode === 'board' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1100px]">
            {STAGES.map((stage) => {
              const stageApps = applications.filter((a) => a.status === stage);
              return (
                <div
                  key={stage}
                  className="w-72 bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex flex-col shrink-0"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200 mb-3">
                    <span className="text-xs font-bold text-neutral-900">{stage}</span>
                    <span className="text-xs font-mono tabular-nums text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {stageApps.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-neutral-400">
                        Nenhuma vaga
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className="bg-white border border-neutral-200 hover:border-neutral-300 rounded p-3 text-xs shadow-2xs cursor-pointer transition-colors space-y-2"
                        >
                          <div>
                            <p className="font-semibold text-neutral-900 leading-snug">{app.jobTitle}</p>
                            <p className="text-neutral-500 text-[11px] mt-0.5">{app.company}</p>
                          </div>

                          {app.salaryTarget && (
                            <p className="text-[11px] font-mono text-neutral-600 flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-neutral-400" />
                              <span>{app.salaryTarget}</span>
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[10px] text-neutral-400 font-mono">
                            <span>
                              {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Não aplicada'}
                            </span>
                            <span className="text-neutral-900 font-medium">Ver detalhes →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Oportunidade</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Data Aplicação</th>
                <th className="py-2.5 px-4">Alvo Salarial</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-neutral-900">{app.jobTitle}</p>
                    <p className="text-neutral-500 text-[11px]">{app.company}</p>
                  </td>

                  <td className="py-3 px-4">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                      className="p-1 border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-neutral-900 outline-none"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3 px-4 font-mono text-neutral-600">
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}
                  </td>

                  <td className="py-3 px-4 font-mono text-neutral-700">
                    {app.salaryTarget || 'Não informado'}
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onNavigateToAnalysis(app.jobId)}
                      className="text-neutral-600 hover:text-neutral-900 font-medium"
                    >
                      Fit Analysis
                    </button>
                    <button
                      onClick={() => onNavigateToTailoring(app.jobId)}
                      className="text-neutral-900 font-semibold hover:underline"
                    >
                      CV Tailorado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-100">
              <div>
                <p className="text-xs text-neutral-500">{selectedApp.company}</p>
                <h3 className="text-base font-bold text-neutral-900">{selectedApp.jobTitle}</h3>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Mudar Etapa Atual</label>
                <select
                  value={selectedApp.status}
                  onChange={(e) => handleStatusChange(selectedApp.id, e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                >
                  {STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Notas da Candidatura</label>
                <p className="p-2.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-700 leading-relaxed">
                  {selectedApp.notes || 'Sem anotações cadastradas.'}
                </p>
              </div>

              {/* Timeline */}
              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">Histórico da Candidatura</label>
                <div className="space-y-2 border-l-2 border-neutral-200 pl-3">
                  {selectedApp.timeline.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-neutral-900" />
                      <p className="font-semibold text-neutral-900">{ev.status}</p>
                      <p className="text-[10px] font-mono text-neutral-400">
                        {new Date(ev.timestamp).toLocaleString()}
                      </p>
                      {ev.note && <p className="text-neutral-600 mt-0.5">{ev.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
              <button
                onClick={async () => {
                  await onDeleteApplication(selectedApp.id);
                  setSelectedApp(null);
                }}
                className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Candidatura
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const jId = selectedApp.jobId;
                    setSelectedApp(null);
                    onNavigateToTailoring(jId);
                  }}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Abrir CV Gerado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
