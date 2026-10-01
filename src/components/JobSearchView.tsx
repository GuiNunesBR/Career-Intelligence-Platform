import React, { useState, useEffect } from 'react';
import { BackgroundJob, Job, FitAnalysis } from '../shared/types.js';
import { Search, Briefcase, MapPin, Building, Calendar, Star, FileText, Globe, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';

interface JobSearchViewProps {
  jobs: BackgroundJob[];
  onTriggerJob: (jobType: string, payload?: any) => Promise<void>;
  onRefresh: () => void;
  userId: string;
  onNavigate: (tab: string, jobId?: string) => void;
  onSaveAsApplication: (jobId: string) => void;
}

export const JobSearchView: React.FC<JobSearchViewProps> = ({
  jobs,
  onTriggerJob,
  onRefresh,
  userId,
  onNavigate,
  onSaveAsApplication,
}) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  
  const [newAgentName, setNewAgentName] = useState('');
  const [roles, setRoles] = useState('');
  const [seniorities, setSeniorities] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState('');
  const [frequency, setFrequency] = useState('manual');
  
  const [isTriggering, setIsTriggering] = useState(false);

  // Load actual jobs and their fit analyses from the DB
  const [foundJobs, setFoundJobs] = useState<{ job: Job, fit: FitAnalysis | null }[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const isSearchRunning = (jobs || []).some(j => j.jobType === 'job_search_agent' && (j.status === 'running' || j.status === 'queued'));

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    // Only refresh when a search is NOT running (i.e. it just finished) or initially
    if (!isSearchRunning) {
      fetchJobsAndFits();
    }
  }, [isSearchRunning]); 

  const fetchAgents = async () => {
    try {
      const res = await api.getSearchAgents();
      setAgents(res.agents || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJobsAndFits = async () => {
    setIsLoadingJobs(true);
    try {
      const { jobs: allJobs } = await api.getJobs();
      const jobsWithFit = await Promise.all(
        allJobs.map(async (j) => {
          try {
            const { analysis } = await api.getAnalysis(j.id);
            return { job: j, fit: analysis };
          } catch {
            return { job: j, fit: null };
          }
        })
      );
      
      // Sort by functional fit score
      jobsWithFit.sort((a, b) => (b.fit?.dimensions.functionalFit || 0) - (a.fit?.dimensions.functionalFit || 0));
      setFoundJobs(jobsWithFit);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentName || !roles || seniorities.length === 0) return;
    setIsTriggering(true);
    try {
      await api.createSearchAgent({
        name: newAgentName,
        roles: roles.split(',').map(r => r.trim()).filter(Boolean),
        seniority: seniorities,
        location,
        mode,
        frequency
      });
      await fetchAgents();
      setIsCreatingAgent(false);
      onRefresh(); // Refresh background jobs just in case
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await api.deleteSearchAgent(id);
      await fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSeniority = (s: string) => {
    setSeniorities(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar - Search Parameters */}
      <div className="w-full md:w-1/3 xl:w-1/4 space-y-4">
        
        {/* Active Agents */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Search className="w-4 h-4" /> Meus Agentes de Busca
            </h2>
            <button 
              onClick={() => setIsCreatingAgent(true)}
              className="text-xs font-semibold bg-neutral-100 text-neutral-900 px-2 py-1 rounded hover:bg-neutral-200"
            >
              + Novo
            </button>
          </div>
          
          <div className="space-y-3">
            {agents.length === 0 && !isCreatingAgent && (
              <p className="text-xs text-neutral-500 text-center py-4">Nenhum agente configurado.</p>
            )}
            
            {agents.map(agent => (
              <div key={agent.id} className="border border-neutral-200 rounded p-3 relative group">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-bold text-neutral-900">{agent.name}</h3>
                  <button 
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
                <div className="text-xs text-neutral-600 space-y-1">
                  <p><span className="font-semibold">Cargos:</span> {agent.roles.join(', ')}</p>
                  <p><span className="font-semibold">Níveis:</span> {agent.seniority.join(', ')}</p>
                  {(agent.location || agent.mode) && (
                    <p><span className="font-semibold">Local:</span> {[agent.mode, agent.location].filter(Boolean).join(' - ')}</p>
                  )}
                  <p className="mt-2 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1 py-0.5 rounded inline-block">
                    {agent.frequency === 'manual' ? 'Execução Manual' : `A cada ${agent.frequency}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Agent Form */}
        {isCreatingAgent && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-5 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">Configurar Novo Agente</h3>
            <div className="space-y-4 text-xs font-medium text-neutral-700">
              <div>
                <label className="block mb-1">Nome do Agente</label>
                <input 
                  type="text" 
                  placeholder="Ex: Vagas Backend Pleno" 
                  className="w-full border border-neutral-300 rounded p-2 focus:ring-1 focus:ring-neutral-900 bg-white"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1">Cargos (separados por vírgula)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Analista de Marketing, Growth" 
                  className="w-full border border-neutral-300 rounded p-2 focus:ring-1 focus:ring-neutral-900 bg-white"
                  value={roles}
                  onChange={e => setRoles(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block mb-1">Senioridade</label>
                <div className="flex flex-wrap gap-2">
                  {['Júnior', 'Pleno', 'Sênior', 'Especialista', 'Liderança'].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSeniority(s)}
                      className={`px-2 py-1 rounded border ${seniorities.includes(s) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-1">Localização (opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: São Paulo, SP ou Remoto" 
                  className="w-full border border-neutral-300 rounded p-2 focus:ring-1 focus:ring-neutral-900 bg-white"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1">Modalidade (opcional)</label>
                <select 
                  className="w-full border border-neutral-300 rounded p-2 bg-white focus:ring-1 focus:ring-neutral-900"
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                >
                  <option value="">Qualquer modalidade</option>
                  <option value="Remote">Remoto</option>
                  <option value="Hybrid">Híbrido</option>
                  <option value="On-site">Presencial</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Frequência de Busca</label>
                <select 
                  className="w-full border border-neutral-300 rounded p-2 bg-white focus:ring-1 focus:ring-neutral-900"
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                >
                  <option value="manual">Pesquisa Rápida (1 vez agora)</option>
                  <option value="1h">A cada 1 hora</option>
                  <option value="3h">A cada 3 horas</option>
                  <option value="daily">Diariamente</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsCreatingAgent(false)}
                  className="flex-1 py-2 bg-white border border-neutral-300 text-neutral-700 rounded font-semibold hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateAgent}
                  disabled={isTriggering || isSearchRunning || !roles || !newAgentName || seniorities.length === 0}
                  className="flex-1 py-2 bg-neutral-900 text-white rounded font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isSearchRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800 text-center animate-pulse font-medium">
              Um agente está executando buscas ativamente...
            </p>
          </div>
        )}
      </div>

      {/* Main Content - Results */}
      <div className="w-full md:w-2/3 xl:w-3/4 space-y-4">
        <div className="bg-white border border-neutral-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <h2 className="text-lg font-bold text-neutral-900">Matches ({foundJobs.length})</h2>
            <button onClick={fetchJobsAndFits} className="text-xs font-semibold text-neutral-600 hover:text-neutral-900">
              Recarregar
            </button>
          </div>

          <div className="space-y-4">
            {isLoadingJobs ? (
              <div className="py-10 text-center text-sm text-neutral-500 animate-pulse">Carregando matches...</div>
            ) : foundJobs.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500">Nenhuma vaga encontrada ainda. Configure os filtros e inicie a busca!</div>
            ) : (
              foundJobs.map(({ job, fit }) => (
                <div key={job.id} className="border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors flex flex-col md:flex-row gap-4">
                  {/* Score */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-lg
                      ${fit?.dimensions.functionalFit && fit.dimensions.functionalFit >= 80 ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 
                        fit?.dimensions.functionalFit && fit.dimensions.functionalFit >= 50 ? 'border-amber-500 text-amber-700 bg-amber-50' : 
                        'border-rose-500 text-rose-700 bg-rose-50'}`}>
                      {fit?.dimensions.functionalFit || 0}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-grow">
                    <h3 className="text-base font-bold text-neutral-900">{job.title}</h3>
                    <div className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-neutral-700"><Building className="w-3.5 h-3.5" /> {job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded"><Globe className="w-3 h-3" /> {job.employmentType}</span>
                    </div>

                    {fit && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {fit.strongMatches.slice(0, 5).map(kw => (
                          <span key={kw.slice(0, 20)} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10px] font-medium border border-neutral-200">
                            {kw.split(':')[0].slice(0, 30)}...
                          </span>
                        ))}
                        {fit.strongMatches.length > 5 && (
                          <span className="px-2 py-0.5 text-neutral-400 text-[10px] font-medium">+{fit.strongMatches.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-center gap-2">
                    <button 
                      onClick={() => onSaveAsApplication(job.id)}
                      className="w-full text-center px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Candidatar-se
                    </button>
                    <button 
                      onClick={() => onNavigate('tailoring', job.id)}
                      className="w-full text-center px-4 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Gerar CV
                    </button>
                    {job.url && (
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full text-center px-4 py-1.5 border border-neutral-300 text-neutral-700 rounded text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ver Vaga
                      </a>
                    )}
                    {fit && fit.dimensions.functionalFit >= 80 && (
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-emerald-600" /> Top Match
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
