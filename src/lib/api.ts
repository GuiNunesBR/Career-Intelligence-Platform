import {
  User,
  SanitizedUser,
  AuthSession,
  UserCareerLake,
  Job,
  FitAnalysis,
  TailoredCV,
  CoverLetter,
  Application,
  BackgroundJob,
  UserAutomation,
  Experience,
  Project,
  Skill,
  Evidence,
  CareerProfile,
  TailoringMode,
} from '../shared/types.js';

const TOKEN_KEY = 'career_lake_token';
const USER_KEY = 'career_lake_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      (typeof errorData.error === 'string'
        ? errorData.error
        : errorData.error?.message) ||
      errorData.message ||
      `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  // Auth
  getUsers: () => request<{ users: SanitizedUser[] }>('/api/auth/users'),
  login: (credentials: { email: string; password: string }) =>
    request<{ session: AuthSession; user: SanitizedUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    }),
  logout: async () => {
    try {
      await request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // ignore network errors on logout
    } finally {
      clearStoredSession();
    }
  },
  register: (
    email: string,
    name: string,
    role?: string,
    password?: string
  ) =>
    request<{ session: AuthSession; user: SanitizedUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        name,
        role: role || 'Professional',
        password: password || 'CareerLake@2026',
      }),
    }),
  getMe: () => request<{ user: SanitizedUser }>('/api/auth/me'),

  // Career Lake
  getLake: () => request<{ lake: UserCareerLake }>('/api/lake'),
  updateProfile: (updates: Partial<CareerProfile>) =>
    request<{ profile: CareerProfile }>('/api/lake/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  addExperience: (exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    request<{ experience: Experience }>('/api/lake/experience', {
      method: 'POST',
      body: JSON.stringify(exp),
    }),
  addProject: (proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    request<{ project: Project }>('/api/lake/project', {
      method: 'POST',
      body: JSON.stringify(proj),
    }),
  addSkill: (skill: Omit<Skill, 'id' | 'userId'>) =>
    request<{ skill: Skill }>('/api/lake/skill', {
      method: 'POST',
      body: JSON.stringify(skill),
    }),
  addEvidence: (evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>) =>
    request<{ evidence: Evidence }>('/api/lake/evidence', {
      method: 'POST',
      body: JSON.stringify(evidence),
    }),

  // Jobs & Parser
  getJobs: () => request<{ jobs: Job[] }>('/api/jobs'),
  parseJob: (text: string) => request<{ parsed: Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'> }>('/api/jobs/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
  saveJob: (job: Partial<Job>) => request<{ job: Job }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(job),
  }),
  deleteJob: (id: string) => request<{ success: boolean }>(`/api/jobs/${id}`, {
    method: 'DELETE',
  }),

  // Fit Analysis
  getAnalysis: (jobId: string) => request<{ analysis: FitAnalysis | null }>(`/api/jobs/${jobId}/analysis`),
  analyzeJob: (jobId: string) => request<{ analysis: FitAnalysis }>(`/api/jobs/${jobId}/analyze`, {
    method: 'POST',
  }),

  // Tailored Documents
  getCV: (jobId: string) => request<{ cv: TailoredCV | null }>(`/api/jobs/${jobId}/cv`),
  generateCV: (jobId: string, mode: TailoringMode) =>
    request<{ cv: TailoredCV }>(`/api/jobs/${jobId}/cv`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  getCoverLetter: (jobId: string) => request<{ coverLetter: CoverLetter | null }>(`/api/jobs/${jobId}/cover-letter`),
  generateCoverLetter: (jobId: string) =>
    request<{ coverLetter: CoverLetter }>(`/api/jobs/${jobId}/cover-letter`, {
      method: 'POST',
    }),

  // Applications
  getApplications: () => request<{ applications: Application[] }>('/api/applications'),
  saveApplication: (app: Partial<Application>) =>
    request<{ application: Application }>('/api/applications', {
      method: 'POST',
      body: JSON.stringify(app),
    }),
  updateApplicationStatus: (id: string, status: string, note?: string) =>
    request<{ application: Application }>(`/api/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  deleteApplication: (id: string) => request<{ success: boolean }>(`/api/applications/${id}`, {
    method: 'DELETE',
  }),

  // Background Worker
  getBackgroundJobs: () => request<{ backgroundJobs: BackgroundJob[] }>('/api/background-jobs'),
  enqueueBackgroundJob: (jobType: string, payload?: any, scheduledAt?: string) =>
    request<{ backgroundJob: BackgroundJob }>('/api/background-jobs', {
      method: 'POST',
      body: JSON.stringify({ jobType, payload, scheduledAt }),
    }),
  cancelBackgroundJob: (id: string) =>
    request<{ job: BackgroundJob }>(`/api/worker/cancel/${id}`, {
      method: 'POST',
    }),
  retryBackgroundJob: (id: string) =>
    request<{ job: BackgroundJob }>(`/api/worker/retry/${id}`, {
      method: 'POST',
    }),

  // Recurring Automations
  getAutomations: () => request<{ automations: UserAutomation[] }>('/api/automations'),
  createAutomation: (data: { type: string; schedule: any; enabled?: boolean }) =>
    request<{ automation: UserAutomation }>('/api/automations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAutomation: (id: string, updates: Partial<UserAutomation>) =>
    request<{ automation: UserAutomation }>(`/api/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteAutomation: (id: string) =>
    request<{ success: boolean }>(`/api/automations/${id}`, {
      method: 'DELETE',
    }),
  triggerAutomation: (id: string) =>
    request<{ automation: UserAutomation }>(`/api/automations/${id}/trigger`, {
      method: 'POST',
    }),

  // Stats
  getStats: () => request<{ stats: any }>('/api/stats'),
};
