import React, { useState } from 'react';
import { Job, FitAnalysis, EvidenceType } from '../shared/types.js';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BookmarkPlus,
  RefreshCw,
} from 'lucide-react';

interface FitAnalysisViewProps {
  job: Job;
  analysis: FitAnalysis;
  onNavigateToTailoring: (jobId: string) => void;
  onSaveAsApplication: (jobId: string) => void;
  onReanalyze: (jobId: string) => void;
  isReanalyzing?: boolean;
}

export const FitAnalysisView: React.FC<FitAnalysisViewProps> = ({
  job,
  analysis,
  onNavigateToTailoring,
  onSaveAsApplication,
  onReanalyze,
  isReanalyzing,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMatrix = analysis.evidenceMatrix.filter((item) => {
    if (filterType === 'all') return true;
    return item.evidenceType === filterType;
  });

  const getBadgeStyle = (type: EvidenceType) => {
    switch (type) {
      case 'direct':
        return 'text-emerald-800 bg-emerald-50 border border-emerald-200';
      case 'derived':
        return 'text-blue-800 bg-blue-50 border border-blue-200';
      case 'transferable':
        return 'text-amber-800 bg-amber-50 border border-amber-200';
      case 'gap':
        return 'text-rose-800 bg-rose-50 border border-rose-200';
      case 'unknown':
      default:
        return 'text-neutral-700 bg-neutral-100 border border-neutral-200';
    }
  };

  const getBadgeLabel = (type: EvidenceType) => {
    switch (type) {
      case 'direct':
        return 'Evidência Direta';
      case 'derived':
        return 'Evidência Derivada';
      case 'transferable':
        return 'Competência Transferível';
      case 'gap':
        return 'Gap de Domínio / Ausência';
      case 'unknown':
        return 'Não Mapeado no Lake';
    }
  };

  const dims = analysis.dimensions;

  return (
    <div className="space-y-6">
      {/* Header & Job Meta */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span className="font-semibold text-neutral-900">{job.company}</span>
              <span aria-hidden="true">·</span>
              <span>{job.seniority}</span>
              <span aria-hidden="true">·</span>
              <span>{job.location}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Análise de Fit: {job.title}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Mapeamento auditável contra o Career Lake · Gerado em {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onReanalyze(job.id)}
              disabled={isReanalyzing}
              className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>Reanalisar</span>
            </button>

            <button
              onClick={() => onSaveAsApplication(job.id)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors flex items-center gap-1.5"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Salvar em Candidaturas</span>
            </button>

            <button
              onClick={() => onNavigateToTailoring(job.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <span>Gerar CV Sob Medida</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="pt-4">
          <h2 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
            Diagnóstico Executivo de Aderência
          </h2>
          <p className="text-xs text-neutral-700 leading-relaxed max-w-4xl">
            {analysis.overallSummary}
          </p>
        </div>
      </div>

      {/* Multidimensional Fit Profile (Dimension Bars - No fake aggregate score) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Perfil Multidimensional de Fit</h2>
            <p className="text-xs text-neutral-500">
              Aderência decomposta por dimensão de competência, escopo e evidência comprovada
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Functional & Technical */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Functional Fit (Execução)</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.functionalFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.functionalFit}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Technical / Tool Fit</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.technicalFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.technicalFit}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Força Probatória da Evidência</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.evidenceStrength}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.evidenceStrength}%` }} />
              </div>
            </div>
          </div>

          {/* Domain & Transferability */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Domain Fit (Setor / Indústria)</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.domainFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${dims.domainFit < 50 ? 'bg-amber-600' : 'bg-neutral-900'}`}
                  style={{ width: `${dims.domainFit}%` }}
                />
              </div>
              {dims.domainFit < 60 && (
                <p className="text-[10px] text-amber-700 mt-1">
                  Exige competências de domínio não comprovadas no Career Lake.
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Índice de Transferibilidade</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.transferability}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-600 h-full" style={{ width: `${dims.transferability}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Seniority & Scope Fit</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.seniorityScopeFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.seniorityScopeFit}%` }} />
              </div>
            </div>
          </div>

          {/* Leadership & Stakeholder */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Leadership Fit</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.leadershipFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.leadershipFit}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Stakeholder & C-Level Fit</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.stakeholderFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.stakeholderFit}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-neutral-700">Language & Communication Fit</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-900">{dims.languageFit}%</span>
              </div>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-neutral-900 h-full" style={{ width: `${dims.languageFit}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Synthesis Columns: Matches, Transferable & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strong Direct Matches */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Aderência Direta Comprovada</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-neutral-700">
            {analysis.strongMatches.map((m, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Transferable Competencies */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100 text-xs font-semibold text-amber-800">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span>Transferibilidade Funcional</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-neutral-700">
            {analysis.transferableExperiences.map((t, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-amber-600 font-bold shrink-0">↔</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Domain Gaps */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100 text-xs font-semibold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Gaps de Domínio / Ausências</span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-neutral-700">
            {analysis.domainGaps.map((g, idx) => (
              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="text-rose-600 font-bold shrink-0">✕</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* THE EVIDENCE MATRIX (Primary Audit Table) */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Evidence Matrix (Matriz Probatória)</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Auditoria linha por linha: cada requisito da vaga mapeado à sua fonte no Career Lake
            </p>
          </div>

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-md overflow-x-auto text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                filterType === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Todos ({analysis.evidenceMatrix.length})
            </button>
            <button
              onClick={() => setFilterType('direct')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                filterType === 'direct' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Diretos
            </button>
            <button
              onClick={() => setFilterType('transferable')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                filterType === 'transferable' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Transferíveis
            </button>
            <button
              onClick={() => setFilterType('gap')}
              className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                filterType === 'gap' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
              }`}
            >
              Gaps
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-1/4">Requisito da Vaga</th>
                <th className="py-3 px-4 w-1/3">Evidência no Career Lake</th>
                <th className="py-3 px-4">Classificação</th>
                <th className="py-3 px-4">Força</th>
                <th className="py-3 px-4">Origem & Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/80 transition-colors align-top">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-neutral-900">{item.requirementDescription}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{item.importance}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="text-neutral-800 leading-snug">{item.evidenceFound}</p>
                    {item.sourceReferences && item.sourceReferences.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.sourceReferences.map((ref, rIdx) => (
                          <span
                            key={rIdx}
                            className="text-[10px] text-neutral-500 font-mono bg-neutral-100 px-1.5 py-0.5 rounded"
                          >
                            Ref: {ref.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${getBadgeStyle(item.evidenceType)}`}>
                      {getBadgeLabel(item.evidenceType)}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono capitalize text-neutral-700">
                    {item.strength}
                  </td>

                  <td className="py-3 px-4 text-neutral-600 text-[11px] leading-relaxed">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Strategy */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5">
        <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-2">
          Estratégia Recomendada para o Currículo
        </h3>
        <ul className="space-y-1.5 text-xs text-neutral-700">
          {analysis.recommendedCvFocus.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-semibold text-neutral-900">0{idx + 1}.</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-end">
          <button
            onClick={() => onNavigateToTailoring(job.id)}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
          >
            <span>Prosseguir para Tailoring do Currículo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
