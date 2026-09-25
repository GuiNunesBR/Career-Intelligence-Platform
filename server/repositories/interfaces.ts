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
  BackgroundJobType,
  UserAutomation,
} from '../../src/shared/types.js';

export interface IUserRepository {
  getAllUsers(): SanitizedUser[];
  getUserById(id: string): User | null;
  getUserByEmail(email: string): User | null;
  createUser(email: string, name: string, passwordHash?: string, role?: string): User;
  createSession(userId: string): AuthSession;
  getSession(token: string): AuthSession | null;
  deleteSession(token: string): void;
}

export interface ICareerLakeRepository {
  getUserLake(userId: string): UserCareerLake;
  saveUserLake(userId: string, lake: UserCareerLake): void;
  updateProfile(userId: string, updates: Partial<CareerProfile>): CareerProfile;
  addExperience(userId: string, exp: Omit<Experience, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Experience;
  addProject(userId: string, proj: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Project;
  addSkill(userId: string, skill: Omit<Skill, 'id' | 'userId'>): Skill;
  addEvidence(userId: string, evidence: Omit<Evidence, 'id' | 'userId' | 'createdAt'>): Evidence;
  getExperienceById(userId: string, id: string): Experience | null;
  getProjectById(userId: string, id: string): Project | null;
}

export interface IJobRepository {
  getJobs(userId: string): Job[];
  getJobById(userId: string, jobId: string): Job | null;
  saveJob(userId: string, job: Job): Job;
  deleteJob(userId: string, jobId: string): boolean;
}

export interface IAnalysisRepository {
  getAnalyses(userId: string): FitAnalysis[];
  getAnalysisForJob(userId: string, jobId: string): FitAnalysis | null;
  saveAnalysis(userId: string, analysis: FitAnalysis): FitAnalysis;
}

export interface ITailoringRepository {
  getTailoredCVs(userId: string): TailoredCV[];
  getTailoredCVForJob(userId: string, jobId: string): TailoredCV | null;
  saveTailoredCV(userId: string, cv: TailoredCV): TailoredCV;
  getCoverLetters(userId: string): CoverLetter[];
  getCoverLetterForJob(userId: string, jobId: string): CoverLetter | null;
  saveCoverLetter(userId: string, letter: CoverLetter): CoverLetter;
}

export interface IApplicationRepository {
  getApplications(userId: string): Application[];
  getApplicationById(userId: string, id: string): Application | null;
  createApplication(userId: string, app: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Application;
  updateApplicationStatus(userId: string, id: string, status: ApplicationStatus): Application | null;
  deleteApplication(userId: string, id: string): boolean;
}

export interface IJobQueueRepository {
  getBackgroundJobs(userId: string): BackgroundJob[];
  getJobById(userId: string, id: string): BackgroundJob | null;
  getAllPendingJobs(): BackgroundJob[];
  saveBackgroundJob(userId: string, job: BackgroundJob): BackgroundJob;
  cancelJob(userId: string, id: string): BackgroundJob | null;
}

export interface IAutomationRepository {
  getAutomations(userId: string): UserAutomation[];
  getAutomationById(userId: string, id: string): UserAutomation | null;
  saveAutomation(userId: string, automation: UserAutomation): UserAutomation;
  deleteAutomation(userId: string, id: string): boolean;
  getAllActiveAutomations(): UserAutomation[];
}
