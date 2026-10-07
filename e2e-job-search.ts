import { config } from 'dotenv';
config();
import { aiService } from './server/container.js';
import { jobScraperService } from './server/services/job-scraper.service.js';
import { jobRepository, analysisRepository, careerLakeRepository, userRepository } from './server/container.js';

async function runE2E() {
  console.log("=== INICIANDO E2E POC: BUSCA POR VAGAS ===");
  try {
    // 1. Get first user
    const users = await userRepository.getAllUsers();
    if (users.length === 0) {
      console.log("Nenhum usuário no banco. E2E abortado.");
      return;
    }
    const userId = users[0].id;
    console.log("Usuário ativo:", users[0].name, "ID:", userId);

    // 2. Load Career Lake
    const lake = await careerLakeRepository.getUserLake(userId);
    console.log("Career Lake recuperado. Evidencias:", lake.evidences.length);

    // 3. Search Jobs
    const roles = "Analista de Marketing";
    const location = "Remote, SP";
    const mode = "Remote";
    console.log(`Buscando Vagas para: ${roles} em ${location} (${mode})`);
    
    const scrapedJobs = await jobScraperService.searchJobs(roles, location, mode);
    console.log(`Encontradas ${scrapedJobs.length} vagas.`);
    
    if (scrapedJobs.length === 0) {
      console.log("Nenhuma vaga encontrada pelo Scraper (Mock ou Real).");
      return;
    }

    let count = 0;
    // 4. Parse Jobs and Analyze Fit
    for (const mJob of scrapedJobs) {
      console.log(`Processando vaga: ${mJob.title} na ${mJob.company}...`);
      const parsed = await aiService.parseJob(mJob.rawText);
      
      const jobId = `job_${Date.now()}_${count}`;
      const savedJob = await jobRepository.saveJob(userId, {
        ...mJob,
        id: jobId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requirements: parsed.requirements
      });

      const analysisData = await aiService.analyzeFit(lake, savedJob);
      await analysisRepository.saveAnalysis(userId, {
        ...analysisData,
        id: `fit_${Date.now()}_${savedJob.id}`,
        userId,
        jobId: savedJob.id,
        createdAt: new Date().toISOString()
      });
      console.log(`✅ Salvo e analisado: ${savedJob.title} (Fit: ${analysisData.dimensions.functionalFit})`);
      count++;
    }
    console.log("=== E2E POC FINALIZADO COM SUCESSO ===");
  } catch (err) {
    console.error("Erro no E2E:", err);
  }
}

runE2E().then(() => process.exit(0)).catch(console.error);
