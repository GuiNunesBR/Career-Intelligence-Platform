import React, { useState } from 'react';
import { Job, JobRequirement } from '../shared/types.js';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle,
  Layers,
  FileText,
  AlertCircle,
  BookmarkPlus,
} from 'lucide-react';

interface JobAnalyzerViewProps {
  onAnalyzeJobText: (text: string) => Promise<Job>;
  onQueueAnalysis: (text: string) => Promise<void>;
  onViewAnalysis: (jobId: string) => void;
  isLoading: boolean;
}

const PRESET_JOBS = [
  {
    id: 'preset_cosmetic',
    title: 'Coordenador de Desenvolvimento Cosmético & Embalagens',
    company: 'L\'Éclat Cosmétiques International',
    seniority: 'Coordenador / Especialista',
    category: 'Cosméticos & R&I',
    text: `VAGA: Coordenador de Desenvolvimento de Produtos Cosméticos e Embalagens
EMPRESA: L'Éclat Cosmétiques International
LOCALIZAÇÃO: São Paulo, SP (Híbrido)

Estamos buscando um Coordenador para liderar o desenvolvimento de novas fórmulas cosméticas de skincare e linhas de tratamento capilar, garantindo estabilidade físico-química, compatibilidade com embalagens primárias e conformidade com Boas Práticas de Fabricação (BPF / ISO 22716).

RESPONSABILIDADES:
• Liderar o desenvolvimento de formulações cosméticas inovadoras (emulsões, séruns, protetores solares e tensoativos).
• Validar testes de estabilidade acelerada (temperatura, umidade e centrifugação) e compatibilidade com embalagens (PET, vidro, pumps airless).
• Coordenar o cronograma de projetos de lançamento de produtos, garantindo controle de custos de formulação, cumprimento de marcos e análise de riscos de fornecimento.
• Alinhar interface com diretoria de marketing, compras, regulatório (ANVISA) e operações fabris.
• Assegurar cumprimento de requisitos regulatórios e documentação técnica para dossiês de registro cosmético.

REQUISITOS OBRIGATÓRIOS:
• Experiência comprovada em formulação cosmética e desenvolvimento de produtos de beleza/R&I.
• Conhecimento prático de ensaios de compatibilidade formulação-embalagem e mecanismos de envase.
• Experiência em gestão de projetos industriais, controle de custos, prazos e gestão de riscos.
• Habilidade comprovada de interlocução com stakeholders seniores e liderança multifuncional.
• Fluência ou inglês avançado para interlocução com fornecedores internacionais de matérias-primas.`,
  },
  {
    id: 'preset_industrial',
    title: 'Senior Project & Capex Controls Manager',
    company: 'Apex Industrial Capital',
    seniority: 'Lead / Principal',
    category: 'Engenharia & Capex',
    text: `POSITION: Senior Project & Capex Controls Manager
COMPANY: Apex Industrial Capital
LOCATION: São Paulo, SP / Remote (Hybrid)

Apex Industrial is seeking a Senior Project & Capex Controls Manager to oversee capital expenditure portfolios and project controls across 4 manufacturing assets.

KEY RESPONSIBILITIES:
• Lead full financial governance, monthly Capex/Opex variance reviews, and earned value analysis (EVA) for $40M+ industrial projects.
• Establish quantitative project risk management registers and mitigation strategies using Primavera P6 and Monte Carlo simulations.
• Direct executive monthly steering committee presentations with C-level stakeholders (CFO, COO).
• Implement robust contractor change-order review frameworks to eliminate unsubstantiated claims and scope creep.
• Standardize SAP PS / CO project accounting and cost breakdown structures (CBS).

REQUIREMENTS:
• Proven track record managing $20M+ industrial capital projects (Capex/Opex).
• Advanced proficiency in Primavera P6, SAP PS/CO, and quantitative risk management.
• Direct experience facilitating C-suite project governance and steering committees.
• Strong background in contract disputes, claims avoidance, and EPC negotiations.
• Fluent English for global stakeholder reporting.`,
  },
  {
    id: 'preset_cloud',
    title: 'Principal Cloud Architect & DevOps Platform Lead',
    company: 'Vortex Cloud Distributed Systems',
    seniority: 'Principal Architect',
    category: 'Tecnologia & Infraestrutura',
    text: `POSITION: Principal Cloud Architect & DevOps Platform Lead
COMPANY: Vortex Cloud Distributed Systems
LOCATION: 100% Remote

We are seeking a Principal Cloud Solutions Architect to design high-throughput microservices architecture on GCP / AWS with multi-region Kubernetes clusters.

REQUIREMENTS:
• 8+ years hands-on experience designing distributed cloud architectures (AWS / GCP) and multi-region Kubernetes deployments.
• Deep expertise in Terraform, GitOps (ArgoCD), and zero-trust service mesh (Istio).
• Track record of architecting systems handling 50k+ requests/second with 99.99% availability.
• Experience managing $500k+ monthly cloud infrastructure budgets and FinOps optimization.
• Executive technical communication and architecture review board governance.`,
  },
];

export const JobAnalyzerView: React.FC<JobAnalyzerViewProps> = ({
  onAnalyzeJobText,
  onQueueAnalysis,
  onViewAnalysis,
  isLoading,
}) => {
  const [jobText, setJobText] = useState(PRESET_JOBS[0].text);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_JOBS[0].id);
  const [analyzedJob, setAnalyzedJob] = useState<Job | null>(null);

  const handleSelectPreset = (preset: typeof PRESET_JOBS[0]) => {
    setSelectedPreset(preset.id);
    setJobText(preset.text);
    setAnalyzedJob(null);
  };

  const handleRunImmediateAnalysis = async () => {
    if (!jobText.trim()) return;
    try {
      const job = await onAnalyzeJobText(jobText);
      setAnalyzedJob(job);
      onViewAnalysis(job.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQueueBackgroundJob = async () => {
    if (!jobText.trim()) return;
    try {
      await onQueueAnalysis(jobText);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
          <span>Job Intelligence Engine</span>
          <span aria-hidden="true">·</span>
          <span>Extração Estruturada & Mapeamento de Evidências</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">
          Analisar Vaga contra o Career Lake
        </h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-3xl">
          Cole a descrição de qualquer oportunidade. O motor extrai os requisitos obrigatórios e desejáveis, classifica por categoria de importância e compara cada item estritamente contra as evidências comprovadas do seu perfil.
        </p>

        {/* Benchmark Presets */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
            Carregar Vaga Benchmark para Teste:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PRESET_JOBS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-3 rounded border text-xs transition-colors ${
                    isSelected
                      ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                    <span>{preset.category}</span>
                    <span className="font-mono">{preset.seniority}</span>
                  </div>
                  <p className="font-semibold text-neutral-900 leading-snug">{preset.title}</p>
                  <p className="text-neutral-500 text-[11px] mt-0.5">{preset.company}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Descrição Completa da Oportunidade
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">
              {jobText.length} caracteres
            </span>
          </div>

          <textarea
            rows={12}
            value={jobText}
            onChange={(e) => {
              setJobText(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="Cole aqui a descrição completa da vaga (LinkedIn, Gupy, site de carreiras, etc.)..."
            className="w-full p-3 text-xs font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 leading-relaxed"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-neutral-500">
            <span>O sistema nunca inventará experiências para forçar pontuação alta.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleQueueBackgroundJob}
              disabled={isLoading || !jobText.trim()}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Agendar no Background Worker</span>
            </button>

            <button
              onClick={handleRunImmediateAnalysis}
              disabled={isLoading || !jobText.trim()}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando Análise de Fit...</span>
                </>
              ) : (
                <>
                  <span>Analisar Vaga Agora</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
