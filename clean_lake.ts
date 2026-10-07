import { db } from './server/db/index.js';
import { careerLakes, experiences, skills, education, projects, languages, jobs, fitAnalysis } from './server/db/schema.js';

async function clean() {
  await db.delete(careerLakes);
  await db.delete(experiences);
  await db.delete(skills);
  await db.delete(education);
  await db.delete(projects);
  await db.delete(languages);
  await db.delete(fitAnalysis);
  await db.delete(jobs);
  console.log('User lake and jobs completely wiped!');
  process.exit(0);
}
clean();
