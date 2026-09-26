import assert from 'assert';
import { careerLakeService, jobService, automationService, applicationService } from '../server/container.js';

import { authService } from '../server/container.js';

export async function runOwnershipTests(): Promise<void> {
  console.log('  [TEST SUITE] Strict Multi-User Ownership & Isolation');

  const regA = await authService.register(`alex_${Date.now()}@test.com`, 'Alex Costa', 'Pass123!');
  const userA = regA.user.id;
  await careerLakeService.updateProfile(userA, { headline: 'Headline A' });
  const expA = await careerLakeService.addExperience(userA, { company: 'C', title: 'T', startDate: '2020', employmentType: 'full-time', domain: 'IT', location: 'Rem', description: 'desc' });

  const regB = await authService.register(`mariana_${Date.now()}@test.com`, 'Mariana Silva', 'Pass123!');
  const userB = regB.user.id;
  await careerLakeService.updateProfile(userB, { headline: 'Headline B' });

  // TEST 9 — User isolation: Usuário A não pode acessar/modificar entidades do usuário B
  // 1. Lake Isolation
  const lakeA = await careerLakeService.getUserLake(userA);
  const lakeB = await careerLakeService.getUserLake(userB);

  assert.notStrictEqual(lakeA.profile.headline, lakeB.profile.headline, 'Profiles must be completely distinct');
  assert.ok(lakeA.evidences.every((e) => e.userId === userA), 'All evidences in Lake A must strictly belong to User A');
  assert.ok(lakeB.evidences.every((e) => e.userId === userB), 'All evidences in Lake B must strictly belong to User B');
  console.log('    ✓ TEST 9 — User isolation: Usuário A não pode acessar/modificar entidades do usuário B');

  // 2. Job Isolation
  const jobA = await jobService.createJob(userA, {
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
  const accessedByB = await jobService.getJobById(userB, jobA.id);
  assert.strictEqual(accessedByB, null, 'User B must not be able to retrieve User A job');

  // User B tries to delete Job A
  const deletedByB = await jobService.deleteJob(userB, jobA.id);
  assert.strictEqual(deletedByB, false, 'User B must not be able to delete User A job');

  // Verify Job A is intact for User A
  const stillExistsA = await jobService.getJobById(userA, jobA.id);
  assert.ok(stillExistsA, 'Job A must still exist for User A');
  console.log('    ✓ Cross-user job read and delete forbidden');

  // 3. Evidence Referential Integrity & Isolation
  // User B tries to attach evidence referencing User A's experience
  await assert.rejects(
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

  // 4. Automation Isolation
  const autoA = await automationService.createAutomation(userA, {
    type: 'career_analysis',
    enabled: true,
    schedule: {
      frequency: 'daily',
      time: '04:00',
      timezone: 'America/Sao_Paulo',
    },
  });

  // User B tries to delete or trigger User A automation
  await assert.rejects(
    () => automationService.triggerAutomation(userB, autoA.id),
    /access denied/i,
    'User B must not be able to trigger User A automation'
  );

  await assert.rejects(
    () => automationService.deleteAutomation(userB, autoA.id),
    /access denied/i,
    'User B must not be able to delete User A automation'
  );
  console.log('    ✓ Cross-user automation access and execution blocked');

  // Clean up test job and automation
  await jobService.deleteJob(userA, jobA.id);
  await automationService.deleteAutomation(userA, autoA.id);
}
