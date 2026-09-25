import {
  User,
  SanitizedUser,
  AuthSession,
  CareerProfile,
  Experience,
  Project,
  Skill,
  Evidence,
  UserCareerLake,
  Job,
  FitAnalysis,
  TailoredCV,
  CoverLetter,
  Application,
  ApplicationStatus,
  BackgroundJob,
  UserAutomation,
} from '../../src/shared/types.js';

export interface IUserRepository {
  getAllUsers(): Promise<SanitizedUser[]>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, name: string, passwordHash?: string, role?: string): Promise<User>;
  createSession(userId: string): Promise<AuthSession>;
  getSession(token: string): Promise<AuthSession | null>;
  deleteSession(token: string): Promise<void>;
}

export interface ICareerLakeRepository {
  getUserLake(userId: string): Promise<UserCareerLake>;
  saveUserLake(userId: string, lake: UserCareerLake): Promise<void>;
  updateProfile(userId: string, updates: Partial<CareerProfile>): Promise<CareerProfile>;
  addExperience(userId: string, exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Experience>;
  addProject(userId: string, proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Promise<Skill>;
  addEvidence(userId: string, evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>): Promise<Evidence>;
  getExperienceById(userId: string, id: string): Promise<Experience | null>;
  getProjectById(userId: string, id: string): Promise<Project | null>;
}

export interface IJobRepository {
  getJobs(userId: string): Promise<Job[]>;
  getJobById(userId: string, jobId: string): Promise<Job | null>;
  saveJob(userId: string, job: Job): Promise<Job>;
  deleteJob(userId: string, jobId: string): Promise<boolean>;
}

export interface IAnalysisRepository {
  getAnalyses(userId: string): Promise<FitAnalysis[]>;
  getAnalysisForJob(userId: string, jobId: string): Promise<FitAnalysis | null>;
  saveAnalysis(userId: string, analysis: FitAnalysis): Promise<FitAnalysis>;
}

export interface ITailoringRepository {
  getTailoredCVs(userId: string): Promise<TailoredCV[]>;
  getTailoredCVForJob(userId: string, jobId: string): Promise<TailoredCV | null>;
  saveTailoredCV(userId: string, cv: TailoredCV): Promise<TailoredCV>;
  getCoverLetters(userId: string): Promise<CoverLetter[]>;
  getCoverLetterForJob(userId: string, jobId: string): Promise<CoverLetter | null>;
  saveCoverLetter(userId: string, letter: CoverLetter): Promise<CoverLetter>;
}

export interface IApplicationRepository {
  getApplications(userId: string): Promise<Application[]>;
  getApplicationById(userId: string, id: string): Promise<Application | null>;
  createApplication(userId: string, app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Application>;
  updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Promise<Application | null>;
  deleteApplication(userId: string, id: string): Promise<boolean>;
}

export interface IJobQueueRepository {
  getBackgroundJobs(userId: string): Promise<BackgroundJob[]>;
  getJobById(userId: string, id: string): Promise<BackgroundJob | null>;
  getAllPendingJobs(): Promise<BackgroundJob[]>;
  saveBackgroundJob(userId: string, job: BackgroundJob): Promise<BackgroundJob>;
  cancelJob(userId: string, id: string): Promise<BackgroundJob | null>;
}

export interface IAutomationRepository {
  getAutomations(userId: string): Promise<UserAutomation[]>;
  getAutomationById(userId: string, id: string): Promise<UserAutomation | null>;
  saveAutomation(userId: string, automation: UserAutomation): Promise<UserAutomation>;
  deleteAutomation(userId: string, id: string): Promise<boolean>;
  getAllActiveAutomations(): Promise<UserAutomation[]>;
}
