import React, { useState } from 'react';
import {
  UserCareerLake,
  Experience,
  Project,
  Skill,
  Evidence,
  EvidenceType,
  EvidenceConfidence,
} from '../shared/types.js';
import {
  Database,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Layers,
  Award,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CareerLakeViewProps {
  lake: UserCareerLake;
  onAddExperience: (exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddProject: (proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onAddSkill: (skill: Omit<Skill, 'id' | 'userId'>) => Promise<void>;
  onAddEvidence: (ev: Omit<Evidence, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onRunAudit: () => void;
}

export const CareerLakeView: React.FC<CareerLakeViewProps> = ({
  lake,
  onAddExperience,
  onAddProject,
  onAddSkill,
  onAddEvidence,
  onRunAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'evidences' | 'experiences' | 'projects' | 'skills' | 'profile'>('evidences');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  // New Evidence Form state
  const [newEvStatement, setNewEvStatement] = useState('');
  const [newEvMetric, setNewEvMetric] = useState('');
  const [newEvSource, setNewEvSource] = useState('');
  const [newEvType, setNewEvType] = useState<EvidenceType>('direct');
  const [newEvConfidence, setNewEvConfidence] = useState<EvidenceConfidence>('high');
  const [newEvDomain, setNewEvDomain] = useState('');
  const [newEvExpId, setNewEvExpId] = useState('');

  // New Experience Form state
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpDomain, setNewExpDomain] = useState('');
  const [newExpLocation, setNewExpLocation] = useState('');
  const [newExpStartDate, setNewExpStartDate] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  // New Skill Form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<any>('Functional');
  const [newSkillProficiency, setNewSkillProficiency] = useState<any>('Advanced');
  const [newSkillYears, setNewSkillYears] = useState(5);

  const filteredEvidences = lake.evidences.filter((ev) => {
    const matchesFilter = evidenceFilter === 'all' || ev.type === evidenceFilter;
    const matchesSearch =
      ev.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.metric && ev.metric.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.domainTag && ev.domainTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ev.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvStatement.trim() || !newEvSource.trim()) return;

    await onAddEvidence({
      statement: newEvStatement.trim(),
      metric: newEvMetric.trim() || undefined,
      source: newEvSource.trim(),
      type: newEvType,
      confidence: newEvConfidence,
      domainTag: newEvDomain.trim() || undefined,
      experienceId: newEvExpId || undefined,
    });

    setNewEvStatement('');
    setNewEvMetric('');
    setNewEvSource('');
    setNewEvDomain('');
    setIsEvidenceModalOpen(false);
  };

  const handleCreateExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpCompany.trim() || !newExpTitle.trim()) return;

    await onAddExperience({
      company: newExpCompany.trim(),
      title: newExpTitle.trim(),
      domain: newExpDomain.trim() || 'General',
      location: newExpLocation.trim() || 'São Paulo, Brazil',
      startDate: newExpStartDate || '2022-01',
      isCurrent: true,
      employmentType: 'full-time',
      description: newExpDesc.trim() || 'Strategic professional responsibilities and execution.',
    });

    setNewExpCompany('');
    setNewExpTitle('');
    setNewExpDesc('');
    setIsExpModalOpen(false);
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    await onAddSkill({
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
      yearsExperience: Number(newSkillYears) || 3,
    });

    setNewSkillName('');
    setIsSkillModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span>Fonte Única de Verdade</span>
              <span aria-hidden="true">·</span>
              <span>Auditável por Requisito</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Meu Career Lake
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
              Repositório estruturado de experiências, métricas comprovadas e evidências. Toda afirmação feita pela plataforma é fundamentada nos registros deste Lake.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEvidenceModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Evidência
            </button>
            <button
              onClick={onRunAudit}
              className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-300 rounded-md hover:bg-neutral-100 transition-colors"
            >
              Auditar Integridade
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-200 mt-6 pt-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('evidences')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'evidences'
                ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Banco de Evidências ({lake.evidences.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('experiences')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'experiences'
                ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Experiências ({lake.experiences.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Projetos & Escopos ({lake.projects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'skills'
                ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Skills ({lake.skills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'text-neutral-900 border-b-2 border-neutral-900 font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Perfil & Formação</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EVIDENCES (Core Entity) */}
      {activeTab === 'evidences' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por declaração, métrica ou fonte..."
                className="w-full pl-8 pr-3 py-1.5 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 text-xs"
              />
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-md w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setEvidenceFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  evidenceFilter === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Todas ({lake.evidences.length})
              </button>
              <button
                onClick={() => setEvidenceFilter('direct')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  evidenceFilter === 'direct'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Diretas ({lake.evidences.filter((e) => e.type === 'direct').length})
              </button>
              <button
                onClick={() => setEvidenceFilter('transferable')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  evidenceFilter === 'transferable'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Transferíveis ({lake.evidences.filter((e) => e.type === 'transferable').length})
              </button>
            </div>
          </div>

          {/* Evidence Items Grid */}
          <div className="space-y-3">
            {filteredEvidences.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center text-xs text-neutral-500">
                <p>Nenhuma evidência encontrada com os critérios informados.</p>
                <button
                  onClick={() => setIsEvidenceModalOpen(true)}
                  className="mt-3 px-3 py-1.5 bg-neutral-900 text-white rounded font-medium"
                >
                  Registrar Nova Evidência
                </button>
              </div>
            ) : (
              filteredEvidences.map((ev) => {
                const isDirect = ev.type === 'direct';
                const exp = lake.experiences.find((e) => e.id === ev.experienceId);
                const proj = lake.projects.find((p) => p.id === ev.projectId);

                return (
                  <div
                    key={ev.id}
                    className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span className="font-semibold text-neutral-900">
                            {isDirect ? 'Evidência Direta' : 'Competência Transferível'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Confiança: {ev.confidence.toUpperCase()}</span>
                          {ev.domainTag && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Domínio: {ev.domainTag}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-neutral-400 text-[11px]">ID: {ev.id}</span>
                        </div>

                        <p className="text-sm font-semibold text-neutral-900 leading-snug">
                          "{ev.statement}"
                        </p>

                        {ev.metric && (
                          <div className="text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded inline-block font-mono">
                            Métrica quantitativa: {ev.metric}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Source & Provenance Line */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-700">Fonte Auditável:</span>
                        <span>{ev.source}</span>
                      </div>

                      {(exp || proj) && (
                        <div className="flex items-center gap-2 text-neutral-500">
                          {exp && <span>Vinculado a: {exp.company}</span>}
                          {proj && <span>(Projeto: {proj.name})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPERIENCES */}
      {activeTab === 'experiences' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-neutral-500">Histórico profissional validado com cargos e responsabilidades.</p>
            <button
              onClick={() => setIsExpModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar Experiência
            </button>
          </div>

          <div className="space-y-3">
            {lake.experiences.map((exp) => {
              const expEvidences = lake.evidences.filter((e) => e.experienceId === exp.id);
              return (
                <div key={exp.id} className="bg-white border border-neutral-200 rounded-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">{exp.title}</h3>
                      <p className="text-xs text-neutral-600 font-medium">{exp.company} · {exp.location}</p>
                    </div>
                    <div className="text-xs font-mono text-neutral-500">
                      {exp.startDate} – {exp.isCurrent ? 'Presente' : exp.endDate}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 mt-2 leading-relaxed">{exp.description}</p>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span>Domínio: {exp.domain}</span>
                    <span className="font-medium text-neutral-800">
                      {expEvidences.length} evidência(s) vinculada(s)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-500">Iniciativas, entregáveis e orçamentos executados.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lake.projects.map((proj) => (
              <div key={proj.id} className="bg-white border border-neutral-200 rounded-lg p-5 space-y-2">
                <h3 className="text-sm font-bold text-neutral-900">{proj.name}</h3>
                <p className="text-xs text-neutral-500">Domínio: {proj.domain}</p>
                <p className="text-xs text-neutral-700 leading-relaxed">{proj.description}</p>

                <div className="pt-2 text-xs">
                  <span className="font-semibold text-neutral-800">Escopo:</span> {proj.scope}
                </div>

                {proj.metrics && (
                  <div className="p-2 bg-neutral-50 border border-neutral-200 rounded text-xs font-mono text-neutral-800">
                    Impacto: {proj.metrics}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] text-neutral-500">
                  {proj.technologies.map((t, idx) => (
                    <span key={idx} className="bg-neutral-100 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SKILLS */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-neutral-500">Competências verificadas contra evidências do Career Lake.</p>
            <button
              onClick={() => setIsSkillModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Adicionar Skill
            </button>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Competência</th>
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4">Proficiência</th>
                  <th className="py-2.5 px-4 text-right">Anos de Experiência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {lake.skills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">{skill.name}</td>
                    <td className="py-3 px-4 text-neutral-600">{skill.category}</td>
                    <td className="py-3 px-4 text-neutral-800 font-medium">{skill.proficiency}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-700">
                      {skill.yearsExperience} anos
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider mb-2">
              Headline & Sumário Profissional
            </h3>
            <p className="text-base font-bold text-neutral-900">{lake.profile.headline}</p>
            <p className="text-xs text-neutral-700 mt-2 leading-relaxed">{lake.profile.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-xs">
            <div>
              <span className="text-neutral-500 font-medium">Localização:</span>
              <p className="text-neutral-900 font-semibold mt-0.5">{lake.profile.location}</p>
            </div>
            <div>
              <span className="text-neutral-500 font-medium">Cargos Alvo:</span>
              <p className="text-neutral-900 font-semibold mt-0.5">{lake.profile.targetRoles.join(', ')}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">Formação Acadêmica</h4>
            <div className="space-y-2">
              {lake.profile.education.map((edu, idx) => (
                <div key={idx} className="text-xs flex justify-between py-1">
                  <div>
                    <p className="font-semibold text-neutral-900">{edu.degree} — {edu.field}</p>
                    <p className="text-neutral-500">{edu.institution}</p>
                  </div>
                  <span className="font-mono text-neutral-500">{edu.year}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD EVIDENCE */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">Registrar Nova Evidência no Career Lake</h3>
              <button onClick={() => setIsEvidenceModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvidence} className="space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Afirmação / Entregável *</label>
                <textarea
                  required
                  rows={2}
                  value={newEvStatement}
                  onChange={(e) => setNewEvStatement(e.target.value)}
                  placeholder="Ex: Redução de 55% no tempo de regressão ou Gerenciei portfólio Capex de $45M..."
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Métrica Quantitativa (opcional, mas recomendada)</label>
                <input
                  type="text"
                  value={newEvMetric}
                  onChange={(e) => setNewEvMetric(e.target.value)}
                  placeholder="Ex: 8% economia orçamentária ($3.6M) ou 0.02% taxa de defeitos..."
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Fonte / Origem Comprovatória *</label>
                <input
                  required
                  type="text"
                  value={newEvSource}
                  onChange={(e) => setNewEvSource(e.target.value)}
                  placeholder="Ex: Relatório de Fechamento Contábil, Ata de Reunião com CFO, Laudo ANVISA..."
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Tipo de Evidência</label>
                  <select
                    value={newEvType}
                    onChange={(e) => setNewEvType(e.target.value as any)}
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  >
                    <option value="direct">Direta (Experiência explícita)</option>
                    <option value="transferable">Transferível (Competência aplicável)</option>
                    <option value="derived">Derivada (Inferida com segurança)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Tag de Domínio</label>
                  <input
                    type="text"
                    value={newEvDomain}
                    onChange={(e) => setNewEvDomain(e.target.value)}
                    placeholder="Ex: Cost Control, Formulation..."
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              {lake.experiences.length > 0 && (
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Vincular à Experiência</label>
                  <select
                    value={newEvExpId}
                    onChange={(e) => setNewEvExpId(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  >
                    <option value="">Sem vínculo específico</option>
                    {lake.experiences.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.company} — {exp.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsEvidenceModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Salvar Evidência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPERIENCE */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">Adicionar Experiência Profissional</h3>
              <button onClick={() => setIsExpModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>

            <form onSubmit={handleCreateExperience} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Empresa *</label>
                  <input
                    required
                    type="text"
                    value={newExpCompany}
                    onChange={(e) => setNewExpCompany(e.target.value)}
                    placeholder="Ex: Petrobras, Natura, Embraer..."
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Cargo *</label>
                  <input
                    required
                    type="text"
                    value={newExpTitle}
                    onChange={(e) => setNewExpTitle(e.target.value)}
                    placeholder="Ex: Gerente de Projetos..."
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Domínio</label>
                  <input
                    type="text"
                    value={newExpDomain}
                    onChange={(e) => setNewExpDomain(e.target.value)}
                    placeholder="Ex: Industrial, R&I, Finanças..."
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Início (AAAA-MM)</label>
                  <input
                    type="text"
                    value={newExpStartDate}
                    onChange={(e) => setNewExpStartDate(e.target.value)}
                    placeholder="2020-03"
                    className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  placeholder="Escopo de responsabilidades e escopo gerencial..."
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SKILL */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl border border-neutral-200 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">Adicionar Competência</h3>
              <button onClick={() => setIsSkillModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>

            <form onSubmit={handleCreateSkill} className="space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Nome da Competência *</label>
                <input
                  required
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Ex: Gestão de Riscos, SAP PM..."
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Categoria</label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                >
                  <option value="Functional">Functional</option>
                  <option value="Domain">Domain</option>
                  <option value="Technical">Technical</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Tool">Tool</option>
                  <option value="Language">Language</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Proficiência</label>
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value as any)}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                >
                  <option value="Fundamental">Fundamental</option>
                  <option value="Competent">Competent</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Anos de Experiência</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={newSkillYears}
                  onChange={(e) => setNewSkillYears(Number(e.target.value))}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsSkillModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
