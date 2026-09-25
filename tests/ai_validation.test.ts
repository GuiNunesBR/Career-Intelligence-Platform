import assert from 'assert';
import {
  FitAnalysisAIOutputSchema,
  JobParsingAIOutputSchema,
  TailoringCVAIOutputSchema,
} from '../server/validation/ai_schemas.js';
import { analysisService } from '../server/services/analysis.service.js';
import { jobService } from '../server/services/job.service.js';
import { careerLakeService } from '../server/services/lake.service.js';

export async function runAIValidationTests(): Promise<void> {
  console.log('  [TEST SUITE] AI Output Validation & Grounding');

  // 1. Valid AI Output Parsing
  const validAIJob = {
    title: 'Senior Capex Engineer',
    company: 'Global Infra Corp',
    location: 'São Paulo',
    seniority: 'Senior',
    employmentType: 'Full-time',
    description: 'Lead engineering and governance of multi-million dollar projects.',
    requirements: [
      {
        requirementId: 'req_1',
        category: 'Functional',
        description: 'Capex budget governance',
        importance: 'critical',
        evidenceRequired: 'Demonstrated experience managing $10M+ budgets',
      },
    ],
  };

  const parsed = JobParsingAIOutputSchema.parse(validAIJob);
  assert.strictEqual(parsed.title, 'Senior Capex Engineer');
  console.log('    ✓ Valid AI output accepted by JobParsingAIOutputSchema');

  // 2. Malformed AI Output Rejection
  const malformedAIJob = {
    title: '', // Invalid empty
    company: 'Corp',
    requirements: [], // Invalid empty array
  };

  assert.throws(
    () => JobParsingAIOutputSchema.parse(malformedAIJob),
    (err: any) => err.name === 'ZodError' || Boolean(err.issues),
    'Malformed AI response must be rejected by Zod'
  );
  console.log('    ✓ Malformed AI output rejected by schema');

  // 3. Foreign / Unknown Evidence ID Sanitization & Grounding
  const userA = 'usr_alex_costa';
  const lakeA = careerLakeService.getUserLake(userA);
  const realEvA = lakeA.evidences[0];

  const syntheticFitOutput = {
    jobId: 'job_test_1',
    overallSummary: 'High alignment based on direct metrics.',
    dimensions: {
      functionalFit: 85,
      domainFit: 70,
      technicalFit: 90,
      seniorityScopeFit: 85,
      leadershipFit: 80,
      stakeholderFit: 85,
      languageFit: 90,
      evidenceStrength: 85,
      transferability: 80,
    },
    evidenceMatrix: [
      {
        requirementId: 'req_1',
        requirementDescription: 'Budget control',
        category: 'Functional' as const,
        importance: 'critical' as const,
        evidenceFound: 'Verified $45M Capex project',
        evidenceType: 'direct' as const,
        strength: 'high' as const,
        notes: 'Audited close report',
        sourceReferences: [
          {
            type: 'evidence' as const,
            id: realEvA?.id || 'ev_alex_1',
            label: 'Alex Real Evidence',
          },
          {
            type: 'evidence' as const,
            id: 'ev_fake_hallucinated_999', // Unknown/Hallucinated ID
            label: 'Hallucinated Reference',
          },
          {
            type: 'evidence' as const,
            id: 'ev_mariana_1', // Foreign evidence belonging to Mariana
            label: 'Foreign Evidence Reference',
          },
        ],
      },
    ],
    strongMatches: ['Capex control'],
    transferableExperiences: ['Stakeholder alignment'],
    domainGaps: [],
    missingEvidence: [],
    recommendedCvFocus: ['Lead with metrics'],
  };

  // Validate with schema first
  const parsedFit = FitAnalysisAIOutputSchema.parse(syntheticFitOutput);
  assert.ok(parsedFit);

  // Validate evidence grounding logic (as implemented in analysis.service.ts)
  const item = parsedFit.evidenceMatrix[0];
  const sanitizedReferences = item.sourceReferences.filter((ref) => {
    if (ref.type === 'evidence') {
      return lakeA.evidences.some((ev) => ev.id === ref.id && ev.userId === userA);
    }
    return false;
  });

  assert.strictEqual(sanitizedReferences.length, 1, 'Only genuine User A evidence should be retained');
  assert.strictEqual(sanitizedReferences[0].id, realEvA?.id, 'Genuine evidence ID retained');
  console.log('    ✓ Hallucinated and foreign evidence IDs stripped during grounding validation');

  // 4. Foreign Job ID Validation in Analysis Service
  const jobB = jobService.createJob('usr_mariana_silva', {
    company: 'BioTech Co',
    title: 'Formulation Chemist',
    location: 'Campinas',
    seniority: 'Mid',
    employmentType: 'Full-time',
    description: 'Formulation and stability',
    requirements: [],
    rawText: 'Formulation and stability posting',
  });

  // User A attempts to run fit analysis against Mariana's job
  await assert.rejects(
    async () => analysisService.runFitAnalysis(userA, jobB.id),
    /Job access forbidden|access denied/,
    'Analyzing foreign job must be rejected'
  );
  console.log('    ✓ Foreign job ID access in analysis service blocked');

  jobService.deleteJob('usr_mariana_silva', jobB.id);

  // 5. Tailoring Grounding & Evidence Fallback Regression Tests
  console.log('    [Tailoring Grounding & Anti-Hallucination Suite]');
  const { TailoringService } = await import('../server/services/tailoring.service.js');
  const expA = lakeA.experiences[0];
  const lakeB = careerLakeService.getUserLake('usr_mariana_silva');
  const expB = lakeB.experiences[0];

  const jobA = jobService.createJob(userA, {
    company: 'Alpha Industrial Corp',
    title: 'Director of Strategic Capex',
    location: 'Curitiba',
    seniority: 'Director',
    employmentType: 'Full-time',
    description: 'Lead engineering and governance of capital investments.',
    requirements: [],
    rawText: 'Capex posting',
  });

  // TEST 4 — Tailoring com referências válidas
  const mockAIValid: any = {
    tailorCV: async () => ({
      mode: 'balanced' as const,
      headline: 'Senior Capex Director',
      summary: 'Proven executive in industrial infrastructure.',
      selectedExperiences: [
        {
          experienceId: expA.id,
          company: expA.company,
          title: expA.title,
          period: '2019 - Present',
          bullets: ['Managed $45M portfolio'],
          evidenceCitations: [realEvA?.id || 'ev_alex_1'],
        },
      ],
      selectedSkills: [],
      selectedProjects: [],
      atsKeywordsMatched: ['Capex', 'Industrial'],
      honestyAuditNotes: ['Validated against lake'],
    }),
  };

  const tailoringValidService = new TailoringService(
    undefined,
    undefined,
    undefined,
    undefined,
    mockAIValid
  );

  const cvValid = await tailoringValidService.generateTailoredCV(userA, jobA.id, 'balanced');
  assert.strictEqual(cvValid.selectedExperiences.length, 1);
  assert.strictEqual(cvValid.selectedExperiences[0].experienceId, expA.id);
  console.log('    ✓ TEST 4 — Tailoring com referências válidas: IA retorna experienceIds pertencentes ao usuário → permitido');

  // TEST 5 — Tailoring com referência inexistente
  const mockAIInexistent: any = {
    tailorCV: async () => ({
      mode: 'balanced' as const,
      headline: 'Senior Capex Director',
      summary: 'Summary',
      selectedExperiences: [
        {
          experienceId: expA.id,
          company: expA.company,
          title: expA.title,
          period: '2019 - Present',
          bullets: ['Valid bullet'],
          evidenceCitations: [],
        },
        {
          experienceId: 'experience_nonexistent_999',
          company: 'Phantom Corp',
          title: 'Phantom Lead',
          period: '2018 - 2019',
          bullets: ['Non-existent bullet'],
          evidenceCitations: [],
        },
      ],
      selectedSkills: [],
      selectedProjects: [],
      atsKeywordsMatched: [],
      honestyAuditNotes: [],
    }),
  };

  const tailoringInexistentService = new TailoringService(
    undefined,
    undefined,
    undefined,
    undefined,
    mockAIInexistent
  );

  const cvInexistent = await tailoringInexistentService.generateTailoredCV(userA, jobA.id, 'balanced');
  assert.strictEqual(cvInexistent.selectedExperiences.length, 1);
  assert.strictEqual(cvInexistent.selectedExperiences[0].experienceId, expA.id);
  assert.ok(
    !cvInexistent.selectedExperiences.some((e) => e.experienceId === 'experience_nonexistent_999'),
    'Non-existent experience must be rejected'
  );
  console.log('    ✓ TEST 5 — Tailoring com referência inexistente: IA retorna experienceId inexistente → rejeitado');

  // TEST 6 — Tailoring cross-user
  // User A requesting Tailoring while AI returns experience_B (belonging to User B)
  const mockAICrossUser: any = {
    tailorCV: async () => ({
      mode: 'balanced' as const,
      headline: 'Senior Capex Director',
      summary: 'Summary',
      selectedExperiences: [
        {
          experienceId: expA.id,
          company: expA.company,
          title: expA.title,
          period: '2019 - Present',
          bullets: ['User A genuine bullet'],
          evidenceCitations: [],
        },
        {
          experienceId: expB.id, // Belonging to User B (Mariana)
          company: expB.company,
          title: expB.title,
          period: '2020 - 2022',
          bullets: ['User B foreign bullet'],
          evidenceCitations: [],
        },
      ],
      selectedSkills: [],
      selectedProjects: [],
      atsKeywordsMatched: [],
      honestyAuditNotes: [],
    }),
  };

  const tailoringCrossUserService = new TailoringService(
    undefined,
    undefined,
    undefined,
    undefined,
    mockAICrossUser
  );

  const cvCrossUser = await tailoringCrossUserService.generateTailoredCV(userA, jobA.id, 'balanced');
  assert.strictEqual(cvCrossUser.selectedExperiences.length, 1, 'Only User A experience must survive');
  assert.strictEqual(cvCrossUser.selectedExperiences[0].experienceId, expA.id);
  assert.ok(
    !cvCrossUser.selectedExperiences.some((e) => e.experienceId === expB.id),
    'User B experience must be strictly rejected when tailoring for User A'
  );
  console.log('    ✓ TEST 6 — Tailoring cross-user: IA retorna experienceId pertencente a outro usuário → rejeitado');

  // TEST 7 — Tailoring all-invalid
  // Reproducing exactly the old bug fixture:
  // selectedExperiences = [ { experienceId: "hallucinated_1" }, { experienceId: "hallucinated_2" } ]
  // Expected: AI_OUTPUT_INVALID, zero fallback to parsedCV.selectedExperiences, and neither ID persisted
  const mockAIAllHallucinated: any = {
    tailorCV: async () => ({
      mode: 'balanced' as const,
      headline: 'Hallucinated Title',
      summary: 'Completely ungrounded summary.',
      selectedExperiences: [
        {
          experienceId: 'hallucinated_1',
          company: 'Phantom Corp 1',
          title: 'Phantom Lead',
          period: '2020 - 2021',
          bullets: ['Invented bullet 1'],
          evidenceCitations: [],
        },
        {
          experienceId: 'hallucinated_2',
          company: 'Phantom Corp 2',
          title: 'Phantom Architect',
          period: '2021 - 2022',
          bullets: ['Invented bullet 2'],
          evidenceCitations: [],
        },
      ],
      selectedSkills: [],
      selectedProjects: [],
      atsKeywordsMatched: [],
      honestyAuditNotes: [],
    }),
  };

  const tailoringRegressionService = new TailoringService(
    undefined,
    undefined,
    undefined,
    undefined,
    mockAIAllHallucinated
  );

  // Must throw AI_OUTPUT_INVALID and NEVER fall back to raw hallucinated experiences
  await assert.rejects(
    async () => tailoringRegressionService.generateTailoredCV(userA, jobA.id, 'balanced'),
    (err: any) => {
      assert.ok(
        err.message.includes('AI_OUTPUT_INVALID'),
        `Error must be AI_OUTPUT_INVALID, got: ${err.message}`
      );
      assert.ok(
        err.message.includes('All AI selected experiences failed grounding validation against the user Career Lake'),
        `Error message must explain grounding failure against Career Lake, got: ${err.message}`
      );
      return true;
    },
    'When all AI experiences are hallucinated, it must throw AI_OUTPUT_INVALID with exact message'
  );

  // Verify that neither hallucinated ID was persisted in the repository (confirming zero fallback)
  const persistedCV = tailoringRegressionService.getTailoredCV(userA, jobA.id);
  if (persistedCV) {
    assert.ok(
      !persistedCV.selectedExperiences.some(
        (e) => e.experienceId === 'hallucinated_1' || e.experienceId === 'hallucinated_2'
      ),
      'REGRESSION FAILURE: Raw AI hallucinated experiences must NEVER be persisted'
    );
  }
  console.log('    ✓ TEST 7 — Tailoring all-invalid: IA retorna somente referências inválidas → deve lançar AI_OUTPUT_INVALID');

  // TEST 8 — Persistência não recebe referência inválida
  // Mesmo que o output da IA contenha dados inválidos, nenhum dado inválido pode chegar ao repository
  const mockAIPartialInvalid: any = {
    tailorCV: async () => ({
      mode: 'balanced' as const,
      headline: 'Senior Capex Director',
      summary: 'Summary with some invalid references in AI output.',
      selectedExperiences: [
        {
          experienceId: expA.id, // VÁLIDO
          company: expA.company,
          title: expA.title,
          period: '2019 - Present',
          bullets: ['Valid bullet'],
          evidenceCitations: [realEvA?.id || 'ev_alex_1', 'ev_fake_hallucinated_999'], // 1 válido, 1 falso
        },
        {
          experienceId: 'experience_ghost_777', // INVÁLIDO
          company: 'Ghost Co',
          title: 'Ghost Title',
          period: '2020',
          bullets: ['Ghost bullet'],
          evidenceCitations: [],
        },
        {
          experienceId: expB.id, // FOREIGN (User B)
          company: expB.company,
          title: expB.title,
          period: '2020',
          bullets: ['Foreign bullet'],
          evidenceCitations: [],
        },
      ],
      selectedSkills: [
        { name: 'Financial Modeling', category: 'Finance', evidenceRef: 'ev_fake_ghost_999' },
      ],
      selectedProjects: [
        { projectId: 'proj_foreign_or_fake', name: 'Project Phantom', description: 'Desc', outcomes: [] },
      ],
      atsKeywordsMatched: ['Capex'],
      honestyAuditNotes: [],
    }),
  };

  const tailoringPersistenceService = new TailoringService(
    undefined,
    undefined,
    undefined,
    undefined,
    mockAIPartialInvalid
  );

  await tailoringPersistenceService.generateTailoredCV(userA, jobA.id, 'balanced');
  // Check the object persisted directly in repository
  const persistedInRepo = tailoringPersistenceService.getTailoredCV(userA, jobA.id);
  assert.ok(persistedInRepo, 'CV must be persisted in repository');
  assert.strictEqual(persistedInRepo?.userId, userA, 'Persisted CV must belong to userA');
  assert.strictEqual(persistedInRepo?.selectedExperiences.length, 1, 'Only genuine userA experience can be persisted');
  assert.strictEqual(persistedInRepo?.selectedExperiences[0].experienceId, expA.id);
  assert.ok(
    !persistedInRepo?.selectedExperiences.some(
      (e) => e.experienceId === 'experience_ghost_777' || e.experienceId === expB.id
    ),
    'Neither ghost nor foreign experience can reach the repository'
  );
  assert.ok(
    !persistedInRepo?.selectedExperiences[0].evidenceCitations.includes('ev_fake_hallucinated_999'),
    'Fake evidence citations must never reach the repository'
  );
  assert.strictEqual(
    persistedInRepo?.selectedSkills[0].evidenceRef,
    '',
    'Invalid skill evidenceRef must be stripped before repository persistence'
  );
  assert.strictEqual(
    persistedInRepo?.selectedProjects[0].projectId,
    undefined,
    'Invalid project ID must be stripped before repository persistence'
  );
  console.log('    ✓ TEST 8 — Persistência não recebe referência inválida: Nenhum dado inválido chega ao repository');

  jobService.deleteJob(userA, jobA.id);
}
