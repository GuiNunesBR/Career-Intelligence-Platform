import assert from 'assert';
import { careerLakeService } from '../server/services/lake.service.js';
import { jobService } from '../server/services/job.service.js';
import { automationService } from '../server/services/automation.service.js';
import { applicationService } from '../server/services/application.service.js';

export async function runOwnershipTests(): Promise<void> {
  console.log('  [TEST SUITE] Strict Multi-User Ownership & Isolation');

  const userA = 'usr_alex_costa';
  const userB = 'usr_mariana_silva';

  // TEST 9 — User isolation: Usuário A não pode acessar/modificar entidades do usuário B
  // 1. Lake Isolation
  const lakeA = careerLakeService.getUserLake(userA);
  const lakeB = careerLakeService.getUserLake(userB);

  assert.notStrictEqual(lakeA.profile.headline, lakeB.profile.headline, 'Profiles must be completely distinct');
  assert.ok(lakeA.evidences.every((e) => e.userId === userA), 'All evidences in Lake A must strictly belong to User A');
  assert.ok(lakeB.evidences.every((e) => e.userId === userB), 'All evidences in Lake B must strictly belong to User B');
  console.log('    ✓ TEST 9 — User isolation: Usuário A não pode acessar/modificar entidades do usuário B');

  // 2. Job Isolation
  const jobA = jobService.createJob(userA, {
    company: 'Nexus Tech A',
    title: 'Capex Controller',
    location: 'Remote',
    seniority: 'Senior',
    employmentType: 'Full-time',
    description: 'High budget oversight',
    requirements: [],
    rawText: 'High budget oversight posting',
  });

  // User B tries to get Job A
  const accessedByB = jobService.getJobById(userB, jobA.id);
  assert.strictEqual(accessedByB, null, 'User B must not be able to retrieve User A job');

  // User B tries to delete Job A
  const deletedByB = jobService.deleteJob(userB, jobA.id);
  assert.strictEqual(deletedByB, false, 'User B must not be able to delete User A job');

  // Verify Job A is intact for User A
  const stillExistsA = jobService.getJobById(userA, jobA.id);
  assert.ok(stillExistsA, 'Job A must still exist for User A');
  console.log('    ✓ Cross-user job read and delete forbidden');

  // 3. Evidence Referential Integrity & Isolation
  // User B tries to attach evidence referencing User A's experience
  const expA = lakeA.experiences[0];
  if (expA) {
    assert.throws(
      () =>
        careerLakeService.addEvidence(userB, {
          experienceId: expA.id, // User A's experience
          type: 'direct',
          statement: 'Invalid reference statement',
          metric: '100% test',
          source: 'Fake Document',
          confidence: 'high',
          domainTag: 'Security',
        }),
      /does not exist for this user/,
      'User B must not be able to link evidence to User A experience'
    );
    console.log('    ✓ Cross-user evidence reference rejected');
  }

  // 4. Automation Isolation
  const autoA = automationService.createAutomation(userA, {
    type: 'career_analysis',
    enabled: true,
    schedule: {
      frequency: 'daily',
      time: '04:00',
      timezone: 'America/Sao_Paulo',
    },
  });

  // User B tries to delete or trigger User A automation
  assert.throws(
    () => automationService.triggerAutomation(userB, autoA.id),
    /access denied/,
    'User B must not be able to trigger User A automation'
  );

  assert.throws(
    () => automationService.deleteAutomation(userB, autoA.id),
    /access denied/,
    'User B must not be able to delete User A automation'
  );
  console.log('    ✓ Cross-user automation access and execution blocked');

  // Clean up test job and automation
  jobService.deleteJob(userA, jobA.id);
  automationService.deleteAutomation(userA, autoA.id);
}
