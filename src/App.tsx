import React, { useState, useEffect } from 'react';
import {
  User,
  UserCareerLake,
  Job,
  FitAnalysis,
  TailoredCV,
  CoverLetter,
  Application,
  BackgroundJob,
  UserAutomation,
  ApplicationStatus,
  TailoringMode,
} from './shared/types.js';
import { api, getStoredUser, getStoredToken, setStoredSession } from './lib/api.js';
import { TopBar } from './components/TopBar.js';
import { DashboardView } from './components/DashboardView.js';
import { CareerLakeView } from './components/CareerLakeView.js';
import { JobAnalyzerView } from './components/JobAnalyzerView.js';
import { FitAnalysisView } from './components/FitAnalysisView.js';
import { TailoringView } from './components/TailoringView.js';
import { ApplicationsView } from './components/ApplicationsView.js';
import { JobSearchView } from './components/JobSearchView.js';
import { NewUserModal } from './components/NewUserModal.js';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('lake');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // User Isolated Data
  const [lake, setLake] = useState<UserCareerLake | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [backgroundJobs, setBackgroundJobs] = useState<BackgroundJob[]>([]);

  // Selected Job for Deep Analysis & Tailoring
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<FitAnalysis | null>(null);
  const [currentCV, setCurrentCV] = useState<TailoredCV | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);

  // UI state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);

  // Manual Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const { session, user } = await api.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setStoredSession(session);
      setCurrentUser(user);
      await loadUserData(user.id);
      showToast(`Bem-vindo, ${user.name}!`);
    } catch (err: any) {
      setLoginError(err.message || 'Credenciais inválidas');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Initial load: Fetch users & initialize session
  useEffect(() => {
    async function init() {
      try {
        const { users } = await api.getUsers();
        setAllUsers(users);

        const storedToken = getStoredToken();
        if (storedToken) {
          try {
            const { user } = await api.getMe();
            setCurrentUser(user);
            await loadUserData(user.id);
            return;
          } catch {
            // Token expired, log in explicitly
          }
        }

        const storedUser = getStoredUser();
        const active = storedUser ? users.find((u) => u.id === storedUser.id) || users[0] : users[0];

        if (active) {
          const { session, user } = await api.login({
            email: active.email,
            password: 'CareerLake@2026',
          });
          setStoredSession(session);
          setCurrentUser(user);
          await loadUserData(user.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Poll background jobs periodically if any is running/queued
  useEffect(() => {
    const hasActiveBgJobs = (backgroundJobs || []).some(
      (j) => j.status === 'queued' || j.status === 'running'
    );
    if (!hasActiveBgJobs) return;

    const interval = setInterval(async () => {
      try {
        const { backgroundJobs: updatedBgJobs } = await api.getBackgroundJobs();
        setBackgroundJobs((prev) => {
          const newJobs = updatedBgJobs || [];
          const changed = newJobs.length !== prev.length || 
            newJobs.some((j, i) => prev[i] && j.status !== prev[i].status);
          return changed ? newJobs : prev;
        });
      } catch (err) {
        console.error(err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [backgroundJobs]);

  // Load all isolated records for the target user
  const loadUserData = async (_userId: string) => {
    setIsSyncing(true);
    try {
      const [lakeRes, jobsRes, appsRes, bgRes, autoRes] = await Promise.all([
        api.getLake(),
        api.getJobs(),
        api.getApplications(),
        api.getBackgroundJobs(),
        api.getAutomations(),
      ]);

      setLake(lakeRes.lake);
      setJobs(jobsRes.jobs);
      setApplications(appsRes.applications);
      setBackgroundJobs(bgRes.backgroundJobs);

      // Pre-select first job if exists
      if ((jobsRes.jobs || []).length > 0 && !selectedJobId) {
        const firstJob = (jobsRes.jobs || [])[0];
        setSelectedJobId(firstJob.id);
        loadJobArtifacts(firstJob.id);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadJobArtifacts = async (jobId: string) => {
    try {
      const [analysisRes, cvRes, clRes] = await Promise.all([
        api.getAnalysis(jobId),
        api.getCV(jobId),
        api.getCoverLetter(jobId),
      ]);
      setCurrentAnalysis(analysisRes.analysis);
      setCurrentCV(cvRes.cv);
      setCoverLetter(clRes.coverLetter);
    } catch (err) {
      console.error('Error loading job artifacts:', err);
    }
  };

  // Switch authenticated user (multi-user simulation on same PC)
  const handleSwitchUser = async (userId: string) => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return;
    try {
      const { session, user } = await api.login({
        email: target.email,
        password: 'CareerLake@2026',
      });
      setStoredSession(session);
      setCurrentUser(user);
      setSelectedJobId(null);
      setCurrentAnalysis(null);
      setCurrentCV(null);
      setCoverLetter(null);
      setActiveTab('lake');
      await loadUserData(user.id);
      showToast(`Sessão alterada para ${user.name} (${user.currentRole})`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao trocar de usuário', 'error');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setLake(null);
    setJobs([]);
    setApplications([]);
    setBackgroundJobs([]);
    showToast('Sessão encerrada com sucesso.');
  };

  // Create new user account
  const handleCreateUser = async (email: string, name: string, role: string, password?: string) => {
    const { session, user } = await api.register(email, name, role, password);
    setStoredSession(session);
    setCurrentUser(user);
    const { users } = await api.getUsers();
    setAllUsers(users);
    setSelectedJobId(null);
    setCurrentAnalysis(null);
    setCurrentCV(null);
    setCoverLetter(null);
    setActiveTab('lake');
    await loadUserData(user.id);
    showToast(`Conta criada com sucesso para ${user.name}!`);
  };

  // Career Lake Mutators
  const handleAddExperience = async (exp: any) => {
    const res = await api.addExperience(exp);
    if (lake) {
      setLake({ ...lake, experiences: [res.experience, ...lake.experiences] });
    }
    showToast('Experiência adicionada com sucesso ao Career Lake!');
  };

  const handleAddProject = async (proj: any) => {
    const res = await api.addProject(proj);
    if (lake) {
      setLake({ ...lake, projects: [res.project, ...lake.projects] });
    }
    showToast('Projeto registrado no Career Lake!');
  };

  const handleAddSkill = async (skill: any) => {
    const res = await api.addSkill(skill);
    if (lake) {
      setLake({ ...lake, skills: [...lake.skills, res.skill] });
    }
    showToast('Competência registrada no Career Lake!');
  };

  const handleAddEvidence = async (evidence: any) => {
    const res = await api.addEvidence(evidence);
    if (lake) {
      setLake({ ...lake, evidences: [res.evidence, ...lake.evidences] });
    }
    showToast('Evidência auditada registrada com sucesso!');
  };

  const handleUploadCV = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/lake/upload-cv', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      console.log('Upload initiated:', data);
      
      const jobId = data.jobId;
      if (jobId) {
        showToast('Processando CV em background... Isso pode levar alguns segundos.', 'info');
        
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const jobsRes = await api.getBackgroundJobs();
          const job = jobsRes.backgroundJobs.find((j) => j.id === jobId);
          if (job) {
            if (job.status === 'completed') {
              break;
            } else if (job.status === 'failed' || job.status === 'cancelled') {
              throw new Error('Falha no processamento do background worker');
            }
          }
          attempts++;
        }
      }

      // Refresh career lake
      if (currentUser) {
        await loadUserData(currentUser.id);
        showToast('Currículo processado e dados importados com sucesso!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Falha ao processar currículo', 'error');
    }
  };

  // Job Analysis Actions
  const handleAnalyzeJobText = async (text: string): Promise<Job> => {
    setIsAnalyzingJob(true);
    try {
      // 1. Parse structured job
      const { parsed } = await api.parseJob(text);
      // 2. Save job to user repository
      const { job } = await api.saveJob(parsed);
      setJobs((prev) => [job, ...prev]);
      setSelectedJobId(job.id);

      // 3. Run deep evidence fit analysis
      const { analysis } = await api.analyzeJob(job.id);
      setCurrentAnalysis(analysis);

      // 4. Auto-generate initial balanced CV view
      const { cv } = await api.generateCV(job.id, 'balanced');
      setCurrentCV(cv);

      showToast(`Vaga "${job.title}" analisada com sucesso via Evidence Matrix!`);
      return job;
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  const handleQueueAnalysis = async (text: string) => {
    setIsAnalyzingJob(true);
    try {
      const { parsed } = await api.parseJob(text);
      const { job } = await api.saveJob(parsed);
      setJobs((prev) => [job, ...prev]);

      // Enqueue as background job
      const { backgroundJob } = await api.enqueueBackgroundJob('fit_recalculation', { jobId: job.id });
      setBackgroundJobs((prev) => [backgroundJob, ...prev]);

      showToast(`Análise de "${job.title}" enviada para a fila de segundo plano!`, 'info');
      setActiveTab('job_search');
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  const handleReanalyzeJob = async (jobId: string) => {
    setIsAnalyzingJob(true);
    try {
      const { analysis } = await api.analyzeJob(jobId);
      setCurrentAnalysis(analysis);
      showToast('Análise de fit atualizada contra o Career Lake!');
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  // Tailoring Actions
  const handleGenerateCV = async (jobId: string, mode: TailoringMode, language?: string) => {
    setIsGeneratingCV(true);
    try {
      const { cv } = await api.generateCV(jobId, mode);
      setCurrentCV(cv);
      showToast(`CV gerado no modo ${mode.toUpperCase()} com proveniência auditável!`);
    } finally {
      setIsGeneratingCV(false);
    }
  };

  const handleGenerateCoverLetter = async (jobId: string) => {
    try {
      const { coverLetter: letter } = await api.generateCoverLetter(jobId);
      setCoverLetter(letter);
      showToast('Carta de apresentação estruturada com fatos comprovados!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar carta', 'error');
    }
  };

  // Applications Actions
  const handleSaveAsApplication = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const existing = applications.find((a) => a.jobId === jobId);
    if (existing) {
      showToast('Esta oportunidade já está no pipeline de candidaturas!', 'info');
      setActiveTab('applications');
      return;
    }

    const newApp: Partial<Application> = {
      jobId,
      jobTitle: job.title,
      company: job.company,
      status: 'Ready to Apply',
      notes: `Aderência analisada via Career Lake. Requisitos: ${job.requirements.length} itens.`,
      timeline: [
        {
          status: 'Saved',
          timestamp: new Date().toISOString(),
          note: 'Oportunidade importada e mapeada',
        },
        {
          status: 'Ready to Apply',
          timestamp: new Date().toISOString(),
          note: 'CV e Matriz de Fit disponíveis',
        },
      ],
    };

    const { application } = await api.saveApplication(newApp);
    setApplications((prev) => [application, ...prev]);
    showToast(`Candidatura adicionada ao pipeline com status "Ready to Apply"!`);
    setActiveTab('applications');
  };

  const handleUpdateApplicationStatus = async (
    id: string,
    status: ApplicationStatus,
    note?: string
  ) => {
    const { application } = await api.updateApplicationStatus(id, status, note);
    setApplications((prev) => prev.map((a) => (a.id === id ? application : a)));
    showToast(`Status atualizado para "${status}"!`);
  };

  const handleDeleteApplication = async (id: string) => {
    await api.deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    showToast('Candidatura removida.');
  };

  const handleTriggerBackgroundJob = async (jobType: string, payload?: any) => {
    const { backgroundJob } = await api.enqueueBackgroundJob(jobType, payload);
    setBackgroundJobs((prev) => [backgroundJob, ...prev]);
    showToast(`Tarefa "${jobType}" adicionada à fila assíncrona!`);
  };

  const handleRunAudit = () => {
    handleTriggerBackgroundJob('evidence_audit');
    setActiveTab('job_search');
  };

  const handleTriggerNightWorker = () => {
    handleTriggerBackgroundJob('nightly_analysis');
    setActiveTab('job_search');
  };

  const handleTriggerJobSearch = () => {
    handleTriggerBackgroundJob('job_search_agent');
    setActiveTab('job_search');
  };

  // Navigation router
  const handleNavigate = (tab: string, jobId?: string) => {
    if (jobId) {
      setSelectedJobId(jobId);
      loadJobArtifacts(jobId);
    }
    setActiveTab(tab);
  };

  const selectedJob = (jobs || []).find((j) => j.id === selectedJobId) || (jobs || [])[0] || null;

  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 font-sans antialiased pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium bg-neutral-900 text-white animate-fade-in">
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <TopBar
        currentUser={currentUser}
        allUsers={allUsers}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        onOpenNewUserModal={() => setIsNewUserModalOpen(true)}
        onLogout={handleLogout}
        isSyncing={isSyncing}
      />

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {!currentUser ? (
          <div className="max-w-md mx-auto my-12 bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Acesso ao Career Lake</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Autenticação criptográfica de identidade (Email + Senha)
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  E-mail Profissional
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="alex.costa@industrial-ops.com"
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 text-xs border border-neutral-300 rounded focus:ring-1 focus:ring-neutral-900 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              >
                {isLoggingIn ? 'Autenticando...' : 'Entrar na Plataforma'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-neutral-100">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Acesso Rápido — Contas Seeded
              </p>
              <div className="space-y-1.5">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setLoginEmail(u.email);
                      setLoginPassword('CareerLake@2026');
                    }}
                    className="w-full text-left p-2 rounded border border-neutral-200 hover:bg-neutral-50 text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{u.name}</p>
                      <p className="text-[10px] text-neutral-500">{u.email}</p>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Preencher</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="text-xs text-neutral-700 hover:text-neutral-900 underline font-medium"
                >
                  Criar uma nova conta isolada
                </button>
              </div>
            </div>
          </div>
        ) : !lake ? (
          <div className="py-20 text-center text-xs text-neutral-500">
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Carregando repositório do Career Lake...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={currentUser}
                lake={lake}
                jobs={jobs}
                applications={applications}
                backgroundJobs={backgroundJobs}
                onNavigate={handleNavigate}
                onRunAudit={handleRunAudit}
                onTriggerNightWorker={handleTriggerNightWorker}
                onTriggerJobSearch={handleTriggerJobSearch}
              />
            )}

            {activeTab === 'lake' && (
              <CareerLakeView
                lake={lake}
                onAddExperience={handleAddExperience}
                onAddProject={handleAddProject}
                onAddSkill={handleAddSkill}
                onAddEvidence={handleAddEvidence}
                onRunAudit={handleRunAudit}
                onUploadCV={handleUploadCV}
              />
            )}

            {activeTab === 'analyzer' && (
              <JobAnalyzerView
                onAnalyzeJobText={handleAnalyzeJobText}
                onQueueAnalysis={handleQueueAnalysis}
                onViewAnalysis={(jobId) => handleNavigate('fit_analysis', jobId)}
                isLoading={isAnalyzingJob}
              />
            )}

            {activeTab === 'fit_analysis' && (
              selectedJob && currentAnalysis ? (
                <FitAnalysisView
                  job={selectedJob}
                  analysis={currentAnalysis}
                  onNavigateToTailoring={(jobId) => handleNavigate('tailoring', jobId)}
                  onSaveAsApplication={handleSaveAsApplication}
                  onReanalyze={handleReanalyzeJob}
                  isReanalyzing={isAnalyzingJob}
                />
              ) : (
                <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-xs text-neutral-500 space-y-3">
                  <p>Nenhuma análise selecionada no momento.</p>
                  <button
                    onClick={() => setActiveTab('analyzer')}
                    className="px-4 py-2 bg-neutral-900 text-white rounded font-medium"
                  >
                    Analisar Nova Vaga
                  </button>
                </div>
              )
            )}

            {activeTab === 'tailoring' && (
              selectedJob ? (
                <TailoringView
                  job={selectedJob}
                  lake={lake}
                  currentCV={currentCV}
                  coverLetter={coverLetter}
                  onGenerateCV={handleGenerateCV}
                  onGenerateCoverLetter={handleGenerateCoverLetter}
                  isGenerating={isGeneratingCV}
                />
              ) : (
                <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center text-xs text-neutral-500 space-y-3">
                  <p>Nenhuma vaga selecionada para gerar currículo sob medida.</p>
                  <button
                    onClick={() => setActiveTab('analyzer')}
                    className="px-4 py-2 bg-neutral-900 text-white rounded font-medium"
                  >
                    Analisar Vaga Primeiro
                  </button>
                </div>
              )
            )}

            {activeTab === 'applications' && (
              <ApplicationsView
                applications={applications}
                onUpdateStatus={handleUpdateApplicationStatus}
                onDeleteApplication={handleDeleteApplication}
                onNavigateToAnalysis={(jobId) => handleNavigate('fit_analysis', jobId)}
                onNavigateToTailoring={(jobId) => handleNavigate('tailoring', jobId)}
              />
            )}

            {activeTab === 'job_search' && (
              <JobSearchView
                jobs={backgroundJobs}
                onTriggerJob={handleTriggerBackgroundJob}
                onRefresh={async () => {
                  const [freshBg] = await Promise.all([
                    api.getBackgroundJobs()
                  ]);
                  setBackgroundJobs(freshBg.backgroundJobs);
                }}
                userId={currentUser.id}
                onNavigate={handleNavigate}
                onSaveAsApplication={handleSaveAsApplication}
              />
            )}
          </>
        )}
      </main>

      {/* New User Account Modal */}
      <NewUserModal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        onCreateUser={handleCreateUser}
      />
    </div>
  );
}
