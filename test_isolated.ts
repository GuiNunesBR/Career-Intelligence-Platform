import { parseResumeToLake } from './server/ai.js';
import { JobScraperService } from './server/services/job-scraper.service.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function testIsolated() {
  console.log('--- TESTE 1: AI PARSING ---');
  // Criar um currículo falso bem simples para ver o parse
  const fakeResumeText = `
    Nome: Érika Almeida
    Resumo: Especialista em Marketing com 5 anos de experiência.
    Telefone: 21994708546
    Email: erika@email.com
    Experiência Profissional:
    - Analista de Marketing na TechNova (2020 - 2023). Desenvolvi campanhas de growth.
  `;
  try {
    const aiResult = await parseResumeToLake(fakeResumeText);
    console.log('AI Result TargetRoles:', aiResult.profile.targetRoles);
    console.log('AI Experiences:', aiResult.experiences.length);
    console.log('Se o TargetRole for telefone, CAIU NO FALLBACK!');
  } catch (err) {
    console.error('Erro no AI Parse:', err);
  }

  console.log('\n--- TESTE 2: JOB SCRAPER (REMOTIVE) ---');
  const scraper = new JobScraperService();
  try {
    const jobs = await scraper.searchJobs('Analista de Marketing', 'RJ', 'Remote');
    console.log(`Vagas Encontradas pelo Scraper: ${jobs.length}`);
    if (jobs.length > 0) {
      console.log('Vaga 1:', jobs[0].title, 'at', jobs[0].company);
    }
  } catch (err) {
    console.error('Erro no Scraper:', err);
  }
}

testIsolated();
