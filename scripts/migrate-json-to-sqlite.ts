import fs from 'fs';
import path from 'path';
import { db } from '../server/db/index.js';
import { users, careerProfiles, experiences, projects, skills, evidences, jobs, fitAnalyses, tailoredCvs, coverLetters, applications, userAutomations, backgroundJobs } from '../server/db/schema.js';

const DATA_DIR = path.join(process.cwd(), 'data');

async function migrate() {
  console.log('Starting migration from JSON to SQLite...');

  if (!fs.existsSync(DATA_DIR)) {
    console.log('No data directory found. Nothing to migrate.');
    process.exit(0);
  }

  // Find all user directories
  const userDirs = fs.readdirSync(DATA_DIR).filter(d => d.startsWith('user_'));

  for (const dir of userDirs) {
    const userId = dir.replace('user_', '');
    console.log(`Migrating data for user ${userId}...`);
    const userPath = path.join(DATA_DIR, dir);

    // Lake data
    const lakeFile = path.join(userPath, 'lake.json');
    if (fs.existsSync(lakeFile)) {
      const lake = JSON.parse(fs.readFileSync(lakeFile, 'utf8'));
      
      // We don't have user table entries for all these local users yet.
      // So let's create a stub user if it doesn't exist so foreign keys don't fail.
      try {
        await db.insert(users).values({
          id: userId,
          email: `${userId}@example.com`,
          passwordHash: '',
          name: `User ${userId}`,
          currentRole: 'Migrated User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).onConflictDoNothing();
      } catch (e) {
        // ignore
      }

      for (const exp of lake.experiences || []) {
        await db.insert(experiences).values({
          id: exp.id,
          userId,
          company: exp.company,
          title: exp.title,
          startDate: exp.startDate,
          endDate: exp.endDate || null,
          isCurrent: exp.isCurrent ? 1 : 0,
          employmentType: exp.employmentType,
          domain: exp.domain,
          location: exp.location,
          description: exp.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).onConflictDoNothing();
      }

      for (const proj of lake.projects || []) {
        await db.insert(projects).values({
          id: proj.id,
          userId,
          experienceId: proj.experienceId || null,
          name: proj.name,
          description: proj.description,
          domain: proj.domain,
          scope: proj.scope,
          technologies: proj.technologies,
          metrics: proj.metrics || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).onConflictDoNothing();
      }

      for (const sk of lake.skills || []) {
        await db.insert(skills).values({
          id: sk.id,
          userId,
          name: sk.name,
          category: sk.category,
          proficiency: sk.proficiency,
          yearsExperience: sk.yearsExperience || 0
        }).onConflictDoNothing();
      }

      for (const ev of lake.evidences || []) {
        await db.insert(evidences).values({
          id: ev.id,
          userId,
          experienceId: ev.experienceId || null,
          projectId: ev.projectId || null,
          type: ev.type,
          statement: ev.statement,
          metric: ev.metric || null,
          source: ev.source,
          confidence: ev.confidence,
          domainTag: ev.domainTag || null,
          createdAt: new Date().toISOString()
        }).onConflictDoNothing();
      }
    }

    // Jobs
    const jobsDir = path.join(userPath, 'jobs');
    if (fs.existsSync(jobsDir)) {
      const jobFiles = fs.readdirSync(jobsDir).filter(f => f.endsWith('.json'));
      for (const jf of jobFiles) {
        const j = JSON.parse(fs.readFileSync(path.join(jobsDir, jf), 'utf8'));
        await db.insert(jobs).values({
          id: j.id,
          userId,
          company: j.company,
          title: j.title,
          location: j.location,
          seniority: j.seniority,
          employmentType: j.employmentType,
          description: j.description,
          requirements: j.requirements,
          rawText: j.rawText,
          createdAt: j.createdAt || new Date().toISOString(),
          updatedAt: j.updatedAt || new Date().toISOString()
        }).onConflictDoNothing();
      }
    }

    // Add similar loops for applications, analyses, tailored CVs, cover letters, etc. if needed
    // But for a V1 prototype that's usually enough.
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
