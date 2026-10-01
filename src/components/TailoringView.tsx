import React, { useState } from 'react';
import {
  Job,
  TailoredCV,
  CoverLetter,
  TailoringMode,
  UserCareerLake,
} from '../shared/types.js';
import {
  ShieldCheck,
  Copy,
  Printer,
  Check,
  RefreshCw,
  } from 'lucide-react';

interface TailoringViewProps {
  job: Job;
  lake: UserCareerLake;
  currentCV: TailoredCV | null;
  coverLetter: CoverLetter | null;
  onGenerateCV: (jobId: string, mode: TailoringMode, language?: string) => Promise<void>;
  onGenerateCoverLetter: (jobId: string) => Promise<void>;
  isGenerating?: boolean;
}

export const TailoringView: React.FC<TailoringViewProps> = ({
  job,
  lake,
  currentCV,
  coverLetter,
  onGenerateCV,
  onGenerateCoverLetter,
  isGenerating,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cv' | 'cover_letter' | 'qa' | 'audit'>('cv');
  const [selectedMode, setSelectedMode] = useState<TailoringMode>('balanced');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('pt-br');
  const [copied, setCopied] = useState(false);

  const handleGenerate = (mode: TailoringMode, lang: string) => {
    setSelectedMode(mode);
    setSelectedLanguage(lang);
    onGenerateCV(job.id, mode, lang);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>View Derivada do Career Lake</span>
              <span aria-hidden="true">·</span>
              <span>Vaga: {job.title} ({job.company})</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Tailoring & Geração de Documentos Auditáveis
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              O currículo gerado é uma projeção fiel do seu Career Lake, selecionando as evidências mais pertinentes para a vaga.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyText(JSON.stringify(currentCV, null, 2))}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Tailoring Mode Switcher */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
              Nível de Tailoring (Anti-Alucinação):
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Controla a ênfase estilística. Em nenhum dos modos são gerados dados fictícios.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-md text-xs">
              <button
                onClick={() => handleGenerate('conservative', selectedLanguage)}
                className={`px-3 py-1.5 font-medium rounded transition-colors ${
                  selectedMode === 'conservative'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Conservador
              </button>

              <button
                onClick={() => handleGenerate('balanced', selectedLanguage)}
                className={`px-3 py-1.5 font-medium rounded transition-colors ${
                  selectedMode === 'balanced'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Equilibrado
              </button>

              <button
                onClick={() => handleGenerate('aggressive', selectedLanguage)}
                className={`px-3 py-1.5 font-medium rounded transition-colors ${
                  selectedMode === 'aggressive'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Agressivo
              </button>
            </div>
            
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-md text-xs w-fit">
              <span className="px-2 text-neutral-500 font-semibold">Idioma:</span>
              <button
                onClick={() => handleGenerate(selectedMode, 'pt-br')}
                className={`px-3 py-1 font-medium rounded transition-colors ${selectedLanguage === 'pt-br' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                PT-BR
              </button>
              <button
                onClick={() => handleGenerate(selectedMode, 'en')}
                className={`px-3 py-1 font-medium rounded transition-colors ${selectedLanguage === 'en' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                EN
              </button>
              <button
                onClick={() => handleGenerate(selectedMode, 'es')}
                className={`px-3 py-1 font-medium rounded transition-colors ${selectedLanguage === 'es' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                ES
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-t border-neutral-200 mt-5 pt-3 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('cv')}
            className={`py-1 px-3 rounded transition-colors ${
              activeSubTab === 'cv' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Currículo Sob Medida (CV View)
          </button>

          <button
            onClick={() => {
              setActiveSubTab('cover_letter');
              if (!coverLetter) onGenerateCoverLetter(job.id);
            }}
            className={`py-1 px-3 rounded transition-colors ${
              activeSubTab === 'cover_letter' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Carta de Apresentação
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`py-1 px-3 rounded transition-colors ${
              activeSubTab === 'audit' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Relatório de Auditoria & Proveniência
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-800" />
          <span>Sintetizando documentos com rigor probatório pelo Gemini...</span>
        </div>
      )}

      {/* SUBTAB 1: CURRÍCULO GERADO */}
      {!isGenerating && activeSubTab === 'cv' && currentCV && (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 space-y-6 max-w-4xl mx-auto shadow-sm">
          {/* Header */}
          <div className="border-b border-neutral-200 pb-5">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
              {lake.profile.headline.split('|')[0].trim()}
            </h2>
            <p className="text-sm font-semibold text-neutral-700 mt-0.5">
              {currentCV.headline}
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
              <span>{lake.profile.location}</span>
              <span aria-hidden="true">·</span>
              <span>Visão direcionada para: {job.title} na {job.company}</span>
            </div>
          </div>

          {/* Professional Summary */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Sumário de Qualificações
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed">
              {currentCV.summary}
            </p>
          </div>

          {/* Key Skills */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
              Competências Chave Selecionadas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {currentCV.selectedSkills.map((sk, idx) => (
                <div key={idx} className="p-2.5 bg-neutral-50 border border-neutral-200 rounded">
                  <p className="font-semibold text-neutral-900">{sk.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{sk.evidenceRef}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Experiences with Evidence Citations */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
              Experiência Profissional & Entregáveis
            </h3>
            <div className="space-y-5">
              {currentCV.selectedExperiences.map((exp, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-bold text-neutral-900">
                      {exp.title} — {exp.company}
                    </h4>
                    <span className="text-xs font-mono text-neutral-500">{exp.period}</span>
                  </div>

                  <ul className="space-y-1.5 text-xs text-neutral-700 list-disc pl-4 leading-relaxed">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx}>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Audit Footnote */}
                  {exp.evidenceCitations && exp.evidenceCitations.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1 text-[10px] text-neutral-400 font-mono">
                      {exp.evidenceCitations.map((cite, cIdx) => (
                        <span key={cIdx} className="bg-neutral-100 px-1.5 py-0.5 rounded">
                          {cite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Projects */}
          {currentCV.selectedProjects && currentCV.selectedProjects.length > 0 && (
            <div className="pt-2 border-t border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Projetos & Portfólio Relevante
              </h3>
              <div className="space-y-3">
                {currentCV.selectedProjects.map((p, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="font-semibold text-neutral-900">{p.name}</p>
                    <p className="text-neutral-600 mt-0.5">{p.description}</p>
                    {p.outcomes && (
                      <p className="text-neutral-800 font-mono text-[11px] mt-1 bg-neutral-50 p-1.5 rounded">
                        Métrica: {p.outcomes.join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CARTA DE APRESENTAÇÃO */}
      {!isGenerating && activeSubTab === 'cover_letter' && coverLetter && (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 space-y-5 max-w-3xl mx-auto">
          <div className="border-b border-neutral-100 pb-3">
            <span className="text-xs text-neutral-400">Assunto:</span>
            <h3 className="text-sm font-bold text-neutral-900">{coverLetter.subject}</h3>
            <p className="text-xs text-neutral-500 mt-1">Destinatário: {coverLetter.recipient}</p>
          </div>

          <div className="text-xs text-neutral-800 whitespace-pre-line leading-relaxed font-sans">
            {coverLetter.content}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <h4 className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Fatos Comprovados do Career Lake Utilizados na Carta:
            </h4>
            <ul className="text-xs text-neutral-600 space-y-1">
              {coverLetter.groundedFacts.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600">✓</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RELATÓRIO DE AUDITORIA & PROVENIÊNCIA */}
      {!isGenerating && activeSubTab === 'audit' && currentCV && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Relatório de Integridade Probatória</h3>
              <p className="text-xs text-neutral-500">
                Auditoria de conformidade com o princípio de Não-Alucinação
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {currentCV.honestyAuditNotes.map((note, idx) => (
              <div key={idx} className="p-3 bg-neutral-50 border border-neutral-200 rounded flex items-start gap-2">
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span className="text-neutral-700">{note}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-600 space-y-2">
            <p>
              <strong>Modo de Tailoring Selecionado:</strong> <span className="font-semibold uppercase">{currentCV.mode}</span>
            </p>
            <p>
              <strong>Palavras-chave ATS Alinhadas:</strong> {currentCV.atsKeywordsMatched.join(', ')}
            </p>
            <p className="text-[11px] text-neutral-500">
              * Nota: Todas as palavras-chave incluídas derivam estritamente de responsabilidades comprovadas no Career Lake do usuário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
