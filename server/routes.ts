import express, { Response, NextFunction } from 'express';
import {
  authService,
  careerLakeService,
  jobService,
  analysisService,
  tailoringService,
  applicationService,
  queueService,
  automationService,
  aiService
} from './container.js';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth.middleware.js';
import { validateBody } from './middleware/validation.middleware.js';
import { authRateLimiter } from './middleware/security.middleware.js';
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

apiRouter.get('/auth/users', async (_req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.post('/auth/login', authRateLimiter, validateBody(LoginSchema), async (req, res) => {
  try {
    const result = await authService.login(req.body);
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

apiRouter.post('/auth/register', authRateLimiter, validateBody(RegisterSchema), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    const result = await authService.register(email, name, password, role);
    res.status(201).json(result);
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

apiRouter.post('/auth/logout', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const token = req.headers.authorization?.substring(7).trim();
  if (token) {
    await authService.logout(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// 2. CAREER LAKE (Ground Truth / Source of Truth)
// ==========================================

apiRouter.get('/lake', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const lake = await careerLakeService.getUserLake(req.user!.id);
    res.json({ lake });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

apiRouter.put(
  '/lake/profile',
  authMiddleware,
  validateBody(CareerProfileUpdateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const profile = await careerLakeService.updateProfile(req.user!.id, req.body);
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
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const experience = await careerLakeService.addExperience(req.user!.id, req.body);
      res.status(201).json({ experience });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/project',
  authMiddleware,
  validateBody(ProjectCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await careerLakeService.addProject(req.user!.id, req.body);
      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/skill',
  authMiddleware,
  validateBody(SkillCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const skill = await careerLakeService.addSkill(req.user!.id, req.body);
      res.status(201).json({ skill });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/lake/evidence',
  authMiddleware,
  validateBody(EvidenceCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const evidence = await careerLakeService.addEvidence(req.user!.id, req.body);
      res.status(201).json({ evidence });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// 3. JOBS & PARSING
// ==========================================

apiRouter.get('/jobs', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const jobs = await jobService.getJobs(req.user!.id);
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
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const job = await jobService.createJob(req.user!.id, req.body);
      res.status(201).json({ job });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete('/jobs/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = await jobService.deleteJob(req.user!.id, req.params.id);
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

apiRouter.get('/analysis/:jobId', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const analysis = await analysisService.getAnalysisForJob(req.user!.id, req.params.jobId);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// Job-scoped routes: /jobs/:jobId/analysis & /jobs/:jobId/analyze
apiRouter.get('/jobs/:jobId/analysis', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const analysis = await analysisService.getAnalysisForJob(req.user!.id, req.params.jobId);
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

apiRouter.get('/tailor/cv/:jobId', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cv = await tailoringService.getTailoredCV(req.user!.id, req.params.jobId);
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

apiRouter.get('/tailor/cover-letter/:jobId', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const coverLetter = await tailoringService.getCoverLetter(req.user!.id, req.params.jobId);
    res.json({ coverLetter });
  } catch (err) {
    next(err);
  }
});

// Job-scoped routes: /jobs/:jobId/cv & /jobs/:jobId/cover-letter
apiRouter.get('/jobs/:jobId/cv', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cv = await tailoringService.getTailoredCV(req.user!.id, req.params.jobId);
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

apiRouter.get('/jobs/:jobId/cover-letter', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const coverLetter = await tailoringService.getCoverLetter(req.user!.id, req.params.jobId);
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

apiRouter.get('/applications', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const applications = await applicationService.getApplications(req.user!.id);
    res.json({ applications });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/applications',
  authMiddleware,
  validateBody(ApplicationCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const application = await applicationService.createApplication(req.user!.id, req.body);
      res.json({ application });
    } catch (err) {
      next(err);
    }
  }
);

const handleStatusUpdate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const application = await applicationService.updateApplicationStatus(
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

apiRouter.delete('/applications/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = await applicationService.deleteApplication(req.user!.id, req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. BACKGROUND WORKER & JOB QUEUE
// ==========================================

const handleGetWorkerJobs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const backgroundJobs = await queueService.getJobs(req.user!.id);
    res.json({ backgroundJobs });
  } catch (err) {
    next(err);
  }
};

const handleEnqueueJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const job = await queueService.enqueueJob(
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

apiRouter.post('/worker/cancel/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const job = await queueService.cancelJob(req.user!.id, req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/worker/retry/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const job = await queueService.retryJob(req.user!.id, req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. DASHBOARD STATS
// ==========================================

apiRouter.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const [lake, jobs, apps, bgJobs] = await Promise.all([
      careerLakeService.getUserLake(userId),
      jobService.getJobs(userId),
      applicationService.getApplications(userId),
      queueService.getJobs(userId),
    ]);

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

apiRouter.get('/automations', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const automations = await automationService.getAutomations(req.user!.id);
    res.json({ automations });
  } catch (err) {
    next(err);
  }
});

apiRouter.post(
  '/automations',
  authMiddleware,
  validateBody(UserAutomationCreateSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const automation = await automationService.createAutomation(req.user!.id, req.body);
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
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const automation = await automationService.updateAutomation(req.user!.id, req.params.id, req.body);
      res.json({ automation });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete('/automations/:id', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = await automationService.deleteAutomation(req.user!.id, req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/automations/:id/trigger', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const automation = await automationService.triggerAutomation(req.user!.id, req.params.id);
    res.json({ automation });
  } catch (err) {
    next(err);
  }
});
