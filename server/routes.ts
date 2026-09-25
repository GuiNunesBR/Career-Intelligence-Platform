import express, { Response, NextFunction } from 'express';
import { authService } from './services/auth.service.js';
import { careerLakeService } from './services/lake.service.js';
import { jobService } from './services/job.service.js';
import { analysisService } from './services/analysis.service.js';
import { tailoringService } from './services/tailoring.service.js';
import { applicationService } from './services/application.service.js';
import { queueService } from './services/queue.service.js';
import { automationService } from './services/automation.service.js';
import { aiService } from './services/ai.service.js';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth.middleware.js';
import { validateBody } from './middleware/validation.middleware.js';
import { authRateLimiter, aiRateLimiter } from './middleware/security.middleware.js';
import {
  LoginSchema,
  RegisterSchema,
  CareerProfileUpdateSchema,
  ExperienceCreateSchema,
  ProjectCreateSchema,
  SkillCreateSchema,
  EvidenceCreateSchema,
  JobParseSchema,
  JobCreateSchema,
  FitAnalysisRequestSchema,
  TailorCVRequestSchema,
  CoverLetterRequestSchema,
  ApplicationCreateSchema,
  ApplicationStatusUpdateSchema,
  BackgroundJobEnqueueSchema,
  UserAutomationCreateSchema,
  UserAutomationUpdateSchema,
} from './validation/schemas.js';

export const apiRouter = express.Router();

// ==========================================
// 1. AUTHENTICATION (Zero fallback, Real tokens)
// ==========================================

apiRouter.get('/auth/users', (_req, res, next) => {
  try {
    const users = authService.getAllUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/login', authRateLimiter, validateBody(LoginSchema), (req, res, next) => {
  try {
    const result = authService.login(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      },
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }
});

apiRouter.post('/auth/register', authRateLimiter, validateBody(RegisterSchema), (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;
    const result = authService.register(email, name, password, role);
    res.json(result);
  } catch (err: any) {
    res.status(409).json({
      error: {
        code: 'REGISTER_FAILED',
        message: err.message || 'Registration failed',
      },
      code: 'REGISTER_FAILED',
      message: err.message || 'Registration failed',
    });
  }
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/logout', authMiddleware, (req: AuthenticatedRequest, res) => {
  const token = req.headers.authorization?.substring(7).trim();
  if (token) {
    authService.logout(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// 2. CAREER LAKE (Ground Truth / Source of Truth)
// ==========================================

apiRouter.get('/lake', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const lake = careerLakeService.getUserLake(req.user!.id);
    res.json({ lake });
  } catch (err) {
    next(err);
  }
});

apiRouter.put(
  '/lake/profile',
  authMiddleware,
  validateBody(CareerProfileUpdateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const profile = careerLakeService.updateProfile(req.user!.id, req.body);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/experience',
  authMiddleware,
  validateBody(ExperienceCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const experience = careerLakeService.addExperience(req.user!.id, req.body);
      res.json({ experience });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/project',
  authMiddleware,
  validateBody(ProjectCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const project = careerLakeService.addProject(req.user!.id, req.body);
      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/skill',
  authMiddleware,
  validateBody(SkillCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const skill = careerLakeService.addSkill(req.user!.id, req.body);
      res.json({ skill });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/evidence',
  authMiddleware,
  validateBody(EvidenceCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const evidence = careerLakeService.addEvidence(req.user!.id, req.body);
      res.json({ evidence });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 3. JOBS & PARSING
// ==========================================

apiRouter.get('/jobs', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const jobs = jobService.getJobs(req.user!.id);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/jobs/parse',
  authMiddleware,
  validateBody(JobParseSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = await aiService.parseJob(req.body.text);
      res.json({ parsed });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/jobs',
  authMiddleware,
  validateBody(JobCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const job = jobService.createJob(req.user!.id, req.body);
      res.json({ job });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete('/jobs/:id', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = jobService.deleteJob(req.user!.id, req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. FIT ANALYSIS & EVIDENCE MATRIX
// ==========================================

// Direct fit endpoint (with jobId in body)
apiRouter.post(
  '/analysis/fit',
  authMiddleware,
  validateBody(FitAnalysisRequestSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const analysis = await analysisService.runFitAnalysis(req.user!.id, req.body.jobId);
      res.json({ analysis });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.get('/analysis/:jobId', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const analysis = analysisService.getAnalysisForJob(req.user!.id, req.params.jobId);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// Job-scoped routes: /jobs/:jobId/analysis & /jobs/:jobId/analyze
apiRouter.get('/jobs/:jobId/analysis', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const analysis = analysisService.getAnalysisForJob(req.user!.id, req.params.jobId);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/jobs/:jobId/analyze', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const analysis = await analysisService.runFitAnalysis(req.user!.id, req.params.jobId);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. TAILORED CV & COVER LETTER
// ==========================================

apiRouter.post(
  '/tailor/cv',
  authMiddleware,
  validateBody(TailorCVRequestSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const cv = await tailoringService.generateTailoredCV(req.user!.id, req.body.jobId, req.body.mode);
      res.json({ cv });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.get('/tailor/cv/:jobId', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const cv = tailoringService.getTailoredCV(req.user!.id, req.params.jobId);
    res.json({ cv });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/tailor/cover-letter',
  authMiddleware,
  validateBody(CoverLetterRequestSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const coverLetter = await tailoringService.generateCoverLetter(req.user!.id, req.body.jobId);
      res.json({ coverLetter });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.get('/tailor/cover-letter/:jobId', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const coverLetter = tailoringService.getCoverLetter(req.user!.id, req.params.jobId);
    res.json({ coverLetter });
  } catch (err) {
    next(err);
  }
});

// Job-scoped routes: /jobs/:jobId/cv & /jobs/:jobId/cover-letter
apiRouter.get('/jobs/:jobId/cv', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const cv = tailoringService.getTailoredCV(req.user!.id, req.params.jobId);
    res.json({ cv });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/jobs/:jobId/cv', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const mode = req.body?.mode || 'balanced';
    const cv = await tailoringService.generateTailoredCV(req.user!.id, req.params.jobId, mode);
    res.json({ cv });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/jobs/:jobId/cover-letter', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const coverLetter = tailoringService.getCoverLetter(req.user!.id, req.params.jobId);
    res.json({ coverLetter });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/jobs/:jobId/cover-letter', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const coverLetter = await tailoringService.generateCoverLetter(req.user!.id, req.params.jobId);
    res.json({ coverLetter });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. APPLICATION TRACKING
// ==========================================

apiRouter.get('/applications', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const applications = applicationService.getApplications(req.user!.id);
    res.json({ applications });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/applications',
  authMiddleware,
  validateBody(ApplicationCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const application = applicationService.createApplication(req.user!.id, req.body);
      res.json({ application });
    } catch (err) {
      next(err);
    }
  }
);

const handleStatusUpdate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const application = applicationService.updateApplicationStatus(
      req.user!.id,
      req.params.id,
      req.body.status
    );
    res.json({ application });
  } catch (err) {
    next(err);
  }
};

apiRouter.put(
  '/applications/:id/status',
  authMiddleware,
  validateBody(ApplicationStatusUpdateSchema),
  handleStatusUpdate
);

apiRouter.patch(
  '/applications/:id/status',
  authMiddleware,
  validateBody(ApplicationStatusUpdateSchema),
  handleStatusUpdate
);

apiRouter.delete('/applications/:id', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = applicationService.deleteApplication(req.user!.id, req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. BACKGROUND WORKER & JOB QUEUE
// ==========================================

const handleGetWorkerJobs = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const backgroundJobs = queueService.getJobs(req.user!.id);
    res.json({ backgroundJobs });
  } catch (err) {
    next(err);
  }
};

const handleEnqueueJob = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const job = queueService.enqueueJob(
      req.user!.id,
      req.body.jobType,
      req.body.payload,
      req.body.scheduledAt
    );
    res.json({ backgroundJob: job, job });
  } catch (err) {
    next(err);
  }
};

apiRouter.get('/worker/jobs', authMiddleware, handleGetWorkerJobs);
apiRouter.get('/background-jobs', authMiddleware, handleGetWorkerJobs);

apiRouter.post(
  '/worker/enqueue',
  authMiddleware,
  validateBody(BackgroundJobEnqueueSchema),
  handleEnqueueJob
);
apiRouter.post(
  '/background-jobs',
  authMiddleware,
  validateBody(BackgroundJobEnqueueSchema),
  handleEnqueueJob
);

apiRouter.post('/worker/cancel/:id', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const job = queueService.cancelJob(req.user!.id, req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/worker/retry/:id', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const job = queueService.retryJob(req.user!.id, req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. DASHBOARD STATS
// ==========================================

apiRouter.get('/stats', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const lake = careerLakeService.getUserLake(userId);
    const jobs = jobService.getJobs(userId);
    const apps = applicationService.getApplications(userId);
    const bgJobs = queueService.getJobs(userId);

    const stats = {
      evidencesCount: lake.evidences.length,
      directEvidences: lake.evidences.filter((e) => e.type === 'direct').length,
      transferableEvidences: lake.evidences.filter((e) => e.type === 'transferable').length,
      metricsCount: lake.evidences.filter((e) => Boolean(e.metric)).length,
      jobsCount: jobs.length,
      applicationsCount: apps.length,
      activeApplications: apps.filter((a) => a.status !== 'Rejected' && a.status !== 'Withdrawn').length,
      backgroundJobsQueued: bgJobs.filter((b) => b.status === 'queued' || b.status === 'running').length,
    };

    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9. RECURRING AUTOMATIONS (UserAutomation)
// ==========================================

apiRouter.get('/automations', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const automations = automationService.getAutomations(req.user!.id);
    res.json({ automations });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/automations',
  authMiddleware,
  validateBody(UserAutomationCreateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const automation = automationService.createAutomation(req.user!.id, req.body);
      res.json({ automation });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.put(
  '/automations/:id',
  authMiddleware,
  validateBody(UserAutomationUpdateSchema),
  (req: AuthenticatedRequest, res, next) => {
    try {
      const automation = automationService.updateAutomation(req.user!.id, req.params.id, req.body);
      res.json({ automation });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete('/automations/:id', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = automationService.deleteAutomation(req.user!.id, req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/automations/:id/trigger', authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const automation = automationService.triggerAutomation(req.user!.id, req.params.id);
    res.json({ automation });
  } catch (err) {
    next(err);
  }
});
