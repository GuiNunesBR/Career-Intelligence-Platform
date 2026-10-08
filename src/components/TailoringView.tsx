import React, { useEffect, useState } from 'react';
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
  Download,
  Check,
  RefreshCw,
  } from 'lucide-react';
import { api, AtsCheckResult } from '../lib/api.js';

/** Plain-text version of the CV (same content and order as the PDF), for pasting into forms. */
function cvToPlainText(cv: TailoredCV, lake: UserCareerLake): string {
  const c = lake.profile?.contact || {};
  const lines = [
    c.fullName || '',
    cv.headline,
    [c.email, c.phone, [c.city, c.state].filter(Boolean).join('/'), c.linkedin].filter(Boolean).join(' | '),
    '',
    cv.summary,
    '',
    ...cv.selectedExperiences.flatMap((e) => [`${e.title} | ${e.company} | ${e.period}`, ...e.bullets.map((b) => `• ${b}`), '']),
    cv.selectedSkills.map((s) => s.name).join(', '),
  ];
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

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
  const [activeSubTab, setActiveSubTab] = useState<'cv' | 'cover_letter' | 'qa' | 'audit' | 'ats'>('cv');
  const [selectedMode, setSelectedMode] = useState<TailoringMode>(currentCV?.mode || 'balanced');
  // The server picks the job's language when the CV is first generated
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentCV?.language || 'pt-br');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ats, setAts] = useState<AtsCheckResult | null>(null);
  const [atsState, setAtsState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (currentCV?.language) setSelectedLanguage(currentCV.language);
    if (currentCV?.mode) setSelectedMode(currentCV.mode);
    setAts(null); // the check refers to a specific CV version
  }, [currentCV?.id, currentCV?.language, currentCV?.mode]);

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

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setActionError(null);
    try {
      const { blob, fileName } = await api.downloadCvPdf(job.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionError(err.message || 'Não foi possível gerar o PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const runAtsCheck = async () => {
    setAtsState('loading');
    setActionError(null);
    try {
      const { atsCheck } = await api.getAtsCheck(job.id);
      setAts(atsCheck);
      setAtsState('idle');
    } catch (err: any) {
      setActionError(err.message || 'Não foi possível executar a checagem ATS.');
      setAtsState('error');
    }
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
              onClick={() => currentCV && handleCopyText(cvToPlainText(currentCV, lake))}
              disabled={!currentCV}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 flex items-center gap-1.5 disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={!currentCV || isDownloading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Gerando PDF...' : 'Baixar PDF (ATS)'}</span>
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
            onClick={() => {
              setActiveSubTab('ats');
              if (!ats && currentCV && atsState !== 'loading') runAtsCheck();
            }}
            className={`py-1 px-3 rounded transition-colors ${
              activeSubTab === 'ats' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Checagem ATS
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

        {actionError && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{actionError}</div>
        )}
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
              {lake.profile.contact?.fullName || 'Nome não importado (complete o contato no Career Lake)'}
            </h2>
            <p className="text-sm font-semibold text-neutral-700 mt-0.5">
              {currentCV.headline}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-2">
              {[lake.profile.contact?.email, lake.profile.contact?.phone, lake.profile.location, lake.profile.contact?.linkedin]
                .filter(Boolean)
                .map((item, idx) => (
                  <span key={idx}>{idx > 0 && <span aria-hidden="true" className="mr-2">·</span>}{item}</span>
                ))}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Visão direcionada para: {job.title} na {job.company}</p>
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
                  {sk.category && <p className="text-[11px] text-neutral-500 mt-0.5">{sk.category}</p>}
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
                    {exp.bullets.map((b, bIdx) => {
                      // Show which Lake record backs each bullet (hover)
                      const sources = (exp.bulletEvidence?.[bIdx] || [])
                        .map((id) => lake.evidences.find((ev) => ev.id === id)?.statement || (id === exp.experienceId ? 'Descrição da experiência' : ''))
                        .filter(Boolean);
                      return (
                        <li key={bIdx} title={sources.length ? `Fonte: ${sources.join(' | ')}` : undefined}>
                          <span>{b}</span>
                        </li>
                      );
                    })}
                  </ul>
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

      {/* SUBTAB: CHECAGEM ATS (reads the generated PDF back) */}
      {!isGenerating && activeSubTab === 'ats' && currentCV && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4 text-xs">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Checagem de compatibilidade ATS</h3>
              <p className="text-neutral-500 mt-0.5">
                Lê o texto do próprio PDF gerado, como um ATS faria. Não existe nota ATS universal: cada sistema (Gupy, Workday, Greenhouse…) é diferente, então isto é um checklist.
              </p>
            </div>
            <button
              onClick={runAtsCheck}
              disabled={atsState === 'loading'}
              className="px-3 py-1.5 font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${atsState === 'loading' ? 'animate-spin' : ''}`} />
              <span>Reexecutar</span>
            </button>
          </div>

          {atsState === 'loading' && <p className="text-neutral-500">Gerando o PDF e lendo o texto...</p>}

          {ats && atsState !== 'loading' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                  <p className="text-neutral-500">Palavras-chave que você tem</p>
                  <p className="text-lg font-bold text-neutral-900">{ats.keywordCoverage === null ? 'n/a' : `${ats.keywordCoverage}%`}</p>
                  <p className="text-[10px] text-neutral-400">presentes no CV</p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                  <p className="text-neutral-500">Seções detectadas</p>
                  <p className="text-lg font-bold text-neutral-900">{ats.sectionsFound.length}</p>
                  <p className="text-[10px] text-neutral-400">{ats.sectionsInOrder ? 'na ordem certa' : 'fora de ordem'}</p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                  <p className="text-neutral-500">Páginas</p>
                  <p className="text-lg font-bold text-neutral-900">{ats.pages}</p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
                  <p className="text-neutral-500">Contato no texto</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {[ats.contactFound.email && 'e-mail', ats.contactFound.phone && 'telefone'].filter(Boolean).join(' + ') || 'ausente'}
                  </p>
                </div>
              </div>

              {ats.warnings.length > 0 && (
                <ul className="space-y-1 text-amber-800">
                  {ats.warnings.map((w, idx) => <li key={idx}>• {w}</li>)}
                </ul>
              )}

              {ats.keywordsYouHave.length > 0 && (
                <div>
                  <p className="font-semibold text-neutral-800 mb-1.5">Palavras-chave da vaga que o Career Lake comprova</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ats.keywordsYouHave.map((k) => (
                      <span
                        key={k.keyword}
                        className={`px-2 py-0.5 rounded border ${k.inCv ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                      >
                        {k.inCv ? '✓' : '!'} {k.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ats.keywordsMissingFromLake.length > 0 && (
                <div>
                  <p className="font-semibold text-neutral-800 mb-1.5">Pedidas pela vaga e sem evidência no Career Lake</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ats.keywordsMissingFromLake.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded border bg-neutral-50 border-neutral-200 text-neutral-600">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              <details>
                <summary className="cursor-pointer font-semibold text-neutral-700">Texto extraído do PDF</summary>
                <pre className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded whitespace-pre-wrap text-[11px] text-neutral-700 max-h-96 overflow-auto">{ats.extractedText}</pre>
              </details>
            </>
          )}
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

          {(currentCV.groundingIssues || []).length > 0 && (
            <div className="text-xs space-y-1.5">
              <p className="font-semibold text-amber-800">Removido pela checagem de fatos (sem fonte no Career Lake):</p>
              {(currentCV.groundingIssues || []).map((issue, idx) => (
                <div key={idx} className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900">
                  <span className="font-semibold">{issue.where}:</span> "{issue.text}" — {issue.reason}
                </div>
              ))}
            </div>
          )}

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
