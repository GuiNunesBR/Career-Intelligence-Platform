import fs from 'fs';
import path from 'path';
import { db } from './postgres.js';
import { 
  users, careerProfiles, experiences, projects, skills, 
  evidences, jobs, fitAnalyses, tailoredCvs, coverLetters, 
  applications, userAutomations, backgroundJobs 
} from './schema.js';
import {
  User, UserCareerLake, Job, FitAnalysis, TailoredCV, CoverLetter,
  Application, UserAutomation, BackgroundJob
} from '../../src/shared/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function runDataMigration(dryRun: boolean = true) {
  console.log(`Starting Data Migration... (Dry Run: ${dryRun})`);
  const report = {
    users: 0,
    sessions: 0,
    careerProfiles: 0,
    experiences: 0,
    projects: 0,
    skills: 0,
    evidences: 0,
    jobs: 0,
    fitAnalyses: 0,
    tailoredCvs: 0,
    coverLetters: 0,
    applications: 0,
    userAutomations: 0,
    backgroundJobs: 0,
  };

  // 1. Users
  const usersPath = path.join(DATA_DIR, 'users.json');
  if (fs.existsSync(usersPath)) {
    const data = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    for (const [_id, user] of Object.entries(data) as [string, User][]) {
      report.users++;
      if (!dryRun) {
        await db.insert(users).values({
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash || '',
          avatar: user.avatar,
          currentRole: user.currentRole || 'User',
        }).onConflictDoNothing();
      }
    }
  }

  // 2. User directories
  const userDirs = fs.readdirSync(DATA_DIR).filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory());
  for (const userId of userDirs) {
    const userDir = path.join(DATA_DIR, userId);

    // Lake
    const lakePath = path.join(userDir, 'lake.json');
    if (fs.existsSync(lakePath)) {
      const lake: UserCareerLake = JSON.parse(fs.readFileSync(lakePath, 'utf8'));
      
      if (lake.profile) {
        report.careerProfiles++;
        if (!dryRun) {
          await db.insert(careerProfiles).values({
            id: `prof_${userId}`,
            userId,
            headline: lake.profile.headline,
            summary: lake.profile.summary,
            location: lake.profile.location,
            targetRoles: lake.profile.targetRoles,
            targetIndustries: lake.profile.targetIndustries,
            languages: lake.profile.languages,
            education: lake.profile.education,
          }).onConflictDoNothing();
        }
      }

      for (const exp of lake.experiences || []) {
        report.experiences++;
        if (!dryRun) {
          await db.insert(experiences).values({
            id: exp.id,
            userId,
            company: exp.company,
            title: exp.title,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            employmentType: exp.employmentType || 'full-time',
            domain: exp.domain || 'general',
            location: exp.location || '',
            description: exp.description || '',
          }).onConflictDoNothing();
        }
      }

      for (const proj of lake.projects || []) {
        report.projects++;
        if (!dryRun) {
          await db.insert(projects).values({
            id: proj.id,
            userId,
            experienceId: proj.experienceId,
            name: proj.name,
            description: proj.description,
            domain: proj.domain,
            scope: proj.scope,
            technologies: proj.technologies || [],
            metrics: proj.metrics,
          }).onConflictDoNothing();
        }
      }

      for (const skill of lake.skills || []) {
        report.skills++;
        if (!dryRun) {
          await db.insert(skills).values({
            id: skill.id,
            userId,
            name: skill.name,
            category: skill.category,
            proficiency: skill.proficiency,
            yearsExperience: skill.yearsExperience,
          }).onConflictDoNothing();
        }
      }

      for (const evid of lake.evidences || []) {
        report.evidences++;
        if (!dryRun) {
          await db.insert(evidences).values({
            id: evid.id,
            userId,
            experienceId: evid.experienceId,
            projectId: evid.projectId,
            type: evid.type,
            statement: evid.statement,
            metric: evid.metric,
            source: evid.source,
            confidence: evid.confidence || 'medium',
            domainTag: evid.domainTag,
          }).onConflictDoNothing();
        }
      }
    }

    // Jobs
    const jobsPath = path.join(userDir, 'jobs.json');
    if (fs.existsSync(jobsPath)) {
      const parsedJobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
      const jobList = Array.isArray(parsedJobs) ? parsedJobs : Object.values(parsedJobs) as Job[];
      for (const job of jobList) {
        report.jobs++;
        if (!dryRun) {
          await db.insert(jobs).values({
            id: job.id,
            userId,
            company: job.company,
            title: job.title,
            location: job.location,
            seniority: job.seniority,
            employmentType: job.employmentType,
            description: job.description,
            requirements: job.requirements,
            rawText: job.rawText,
          }).onConflictDoNothing();
        }
      }
    }

    // Analyses
    const analysesPath = path.join(userDir, 'analyses.json');
    if (fs.existsSync(analysesPath)) {
      const parsedAnalyses = JSON.parse(fs.readFileSync(analysesPath, 'utf8'));
      const analysisList = Array.isArray(parsedAnalyses) ? parsedAnalyses : Object.values(parsedAnalyses) as FitAnalysis[];
      for (const analysis of analysisList) {
        report.fitAnalyses++;
        if (!dryRun) {
          await db.insert(fitAnalyses).values({
            id: analysis.id,
            userId,
            jobId: analysis.jobId,
            overallSummary: analysis.overallSummary,
            dimensions: analysis.dimensions,
            evidenceMatrix: analysis.evidenceMatrix,
            strongMatches: analysis.strongMatches,
            transferableExperiences: analysis.transferableExperiences,
            domainGaps: analysis.domainGaps,
            missingEvidence: analysis.missingEvidence,
            recommendedCvFocus: analysis.recommendedCvFocus,
          }).onConflictDoNothing();
        }
      }
    }

    // Tailored CVs
    const cvsPath = path.join(userDir, 'cvs.json');
    if (fs.existsSync(cvsPath)) {
      const parsedCvs = JSON.parse(fs.readFileSync(cvsPath, 'utf8'));
      const cvList = Array.isArray(parsedCvs) ? parsedCvs : Object.values(parsedCvs) as TailoredCV[];
      for (const cv of cvList) {
        report.tailoredCvs++;
        if (!dryRun) {
          await db.insert(tailoredCvs).values({
            id: cv.id,
            userId,
            jobId: cv.jobId,
            mode: cv.mode,
            headline: cv.headline,
            summary: cv.summary,
            selectedExperiences: cv.selectedExperiences,
            selectedSkills: cv.selectedSkills,
            selectedProjects: cv.selectedProjects,
            atsKeywordsMatched: cv.atsKeywordsMatched,
            honestyAuditNotes: cv.honestyAuditNotes,
          }).onConflictDoNothing();
        }
      }
    }

    // Cover Letters
    const lettersPath = path.join(userDir, 'cover_letters.json');
    if (fs.existsSync(lettersPath)) {
      const parsedLetters = JSON.parse(fs.readFileSync(lettersPath, 'utf8'));
      const letterList = Array.isArray(parsedLetters) ? parsedLetters : Object.values(parsedLetters) as CoverLetter[];
      for (const letter of letterList) {
        report.coverLetters++;
        if (!dryRun) {
          await db.insert(coverLetters).values({
            id: letter.id,
            userId,
            jobId: letter.jobId,
            recipient: letter.recipient,
            subject: letter.subject,
            content: letter.content,
            groundedFacts: letter.groundedFacts,
          }).onConflictDoNothing();
        }
      }
    }

    // Applications
    const appsPath = path.join(userDir, 'applications.json');
    if (fs.existsSync(appsPath)) {
      const parsedApps = JSON.parse(fs.readFileSync(appsPath, 'utf8'));
      const appList = Array.isArray(parsedApps) ? parsedApps : Object.values(parsedApps) as Application[];
      for (const app of appList) {
        report.applications++;
        if (!dryRun) {
          await db.insert(applications).values({
            id: app.id,
            userId,
            jobId: app.jobId,
            jobTitle: app.jobTitle,
            company: app.company,
            status: app.status,
            appliedAt: app.appliedAt ? new Date(app.appliedAt) : null,
            cvVersionId: app.cvVersionId,
            coverLetterId: app.coverLetterId,
            notes: app.notes,
            salaryTarget: app.salaryTarget,
            timeline: app.timeline,
          }).onConflictDoNothing();
        }
      }
    }

    // Automations
    const autoPath = path.join(userDir, 'automations.json');
    if (fs.existsSync(autoPath)) {
      const parsedAutos = JSON.parse(fs.readFileSync(autoPath, 'utf8'));
      const autoList = Array.isArray(parsedAutos) ? parsedAutos : Object.values(parsedAutos) as UserAutomation[];
      for (const auto of autoList) {
        report.userAutomations++;
        if (!dryRun) {
          await db.insert(userAutomations).values({
            id: auto.id,
            userId,
            type: auto.type,
            enabled: auto.enabled,
            schedule: auto.schedule,
            nextRunAt: new Date(auto.nextRunAt),
            lastRunAt: auto.lastRunAt ? new Date(auto.lastRunAt) : null,
          }).onConflictDoNothing();
        }
      }
    }

    // Background Jobs
    const bgJobsPath = path.join(userDir, 'background_jobs.json');
    if (fs.existsSync(bgJobsPath)) {
      const parsedBgJobs = JSON.parse(fs.readFileSync(bgJobsPath, 'utf8'));
      const bgList = Array.isArray(parsedBgJobs) ? parsedBgJobs : Object.values(parsedBgJobs) as BackgroundJob[];
      for (const job of bgList) {
        report.backgroundJobs++;
        if (!dryRun) {
          await db.insert(backgroundJobs).values({
            id: job.id,
            userId,
            jobType: job.jobType,
            automationId: job.automationId,
            idempotencyKey: job.idempotencyKey,
            scheduledAt: new Date(job.scheduledAt),
            status: job.status,
            startedAt: job.startedAt ? new Date(job.startedAt) : null,
            finishedAt: job.finishedAt ? new Date(job.finishedAt) : null,
            progress: job.progress,
            result: job.result,
            error: job.error,
            attempt: job.attempt,
            maxAttempts: job.maxAttempts,
            retryCount: job.retryCount,
            logs: job.logs,
          }).onConflictDoNothing();
        }
      }
    }
  }

  console.log('Migration Report:', JSON.stringify(report, null, 2));
  console.log(`Migration Complete. (Dry Run: ${dryRun})`);
  return report;
}
