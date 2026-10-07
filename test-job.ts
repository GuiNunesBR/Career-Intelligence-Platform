import { config } from 'dotenv';
config();
import { aiService } from './server/container.js';
import { jobScraperService } from './server/services/job-scraper.service.js';
import { careerLakeRepository } from './server/container.js';
import { db } from './server/db/index.js';

async function test() {
  console.log("=== TEST JOB SCRAPER ===");
  try {
    const jobs = await jobScraperService.searchJobs("Analista de Marketing", "Rio de janeiro", "Remote");
    console.log(`Found ${jobs.length} jobs.`);
    if (jobs.length > 0) {
      console.log("First job:", jobs[0].title, jobs[0].company);
      console.log("=== TEST AI PARSE JOB ===");
      const parsed = await aiService.parseJob(jobs[0].rawText);
      console.log("Parsed Req Count:", parsed.requirements.length);
    }
  } catch (e) {
    console.error("Job Scraper / Parse Error:", e);
  }
}
test().then(() => process.exit(0)).catch(console.error);
