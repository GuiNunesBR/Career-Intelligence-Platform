import { PgUserRepository } from './repositories/pg.user.repository.js';
import { PgCareerLakeRepository } from './repositories/pg.lake.repository.js';
import { PgJobRepository } from './repositories/pg.job.repository.js';
import { PgAnalysisRepository } from './repositories/pg.analysis.repository.js';
import { PgTailoringRepository } from './repositories/pg.tailoring.repository.js';
import { PgApplicationRepository } from './repositories/pg.application.repository.js';
import { PgQueueRepository } from './repositories/pg.queue.repository.js';
import { PgAutomationRepository } from './repositories/pg.automation.repository.js';

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
// The default path for production is PostgreSQL.
// Legacy JSON repositories are not instantiated here.
export const userRepository = new PgUserRepository();
export const careerLakeRepository = new PgCareerLakeRepository();
export const jobRepository = new PgJobRepository();
export const analysisRepository = new PgAnalysisRepository();
export const tailoringRepository = new PgTailoringRepository();
export const applicationRepository = new PgApplicationRepository();
export const jobQueueRepository = new PgQueueRepository();
export const automationRepository = new PgAutomationRepository();

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
