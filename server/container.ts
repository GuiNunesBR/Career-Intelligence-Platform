import { SqliteUserRepository } from './repositories/sqlite.user.repository.js';
import { SqliteCareerLakeRepository } from './repositories/sqlite.lake.repository.js';
import { SqliteJobRepository } from './repositories/sqlite.job.repository.js';
import { SqliteAnalysisRepository } from './repositories/sqlite.analysis.repository.js';
import { SqliteTailoringRepository } from './repositories/sqlite.tailoring.repository.js';
import { SqliteApplicationRepository } from './repositories/sqlite.application.repository.js';
import { SqliteQueueRepository } from './repositories/sqlite.queue.repository.js';
import { SqliteAutomationRepository } from './repositories/sqlite.automation.repository.js';

import { AuthService } from './services/auth.service.js';
import { CareerLakeService } from './services/lake.service.js';
import { JobService } from './services/job.service.js';
import { AnalysisService } from './services/analysis.service.js';
import { TailoringService } from './services/tailoring.service.js';
import { ApplicationService } from './services/application.service.js';
import { QueueService } from './services/queue.service.js';
import { AutomationService } from './services/automation.service.js';
import { AIService } from './services/ai.service.js';

// =========================================
// 1. REPOSITORIES (Composition Root)
// =========================================
// V3: SQLite
export const userRepository = new SqliteUserRepository();
export const careerLakeRepository = new SqliteCareerLakeRepository();
export const jobRepository = new SqliteJobRepository();
export const analysisRepository = new SqliteAnalysisRepository();
export const tailoringRepository = new SqliteTailoringRepository();
export const applicationRepository = new SqliteApplicationRepository();
export const jobQueueRepository = new SqliteQueueRepository();
export const automationRepository = new SqliteAutomationRepository();

// =========================================
// 2. EXTERNAL SERVICES
// =========================================
export const aiService = new AIService();

// =========================================
// 3. INTERNAL SERVICES
// =========================================
export const authService = new AuthService(userRepository);

export const careerLakeService = new CareerLakeService(careerLakeRepository);

export const jobService = new JobService(jobRepository);

export const analysisService = new AnalysisService(
  analysisRepository,
  jobRepository,
  careerLakeRepository,
  aiService
);

export const tailoringService = new TailoringService(
  tailoringRepository,
  jobRepository,
  careerLakeRepository,
  aiService
);

export const applicationService = new ApplicationService(applicationRepository);

export const queueService = new QueueService(jobQueueRepository);

export const automationService = new AutomationService(
  automationRepository,
  queueService
);
