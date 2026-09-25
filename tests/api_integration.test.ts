import assert from 'assert';
import { app } from '../server/app.js';
import { db } from '../server/db/postgres.js';
import * as schema from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import http from 'http';

export async function runApiIntegrationTests() {
  console.log('--- API Integration Tests (PostgreSQL + Routes) ---');
  
  // Clear previous runs
  await db.delete(schema.users).where(eq(schema.users.email, 'integration@test.com'));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Auth: Register
    console.log('Testing /api/auth/register...');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'integration@test.com', name: 'Integration User', password: 'password123' })
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    const regData = await regRes.json();
    assert.ok(regData.token, 'Should return auth token');
    const token = regData.token;

    // 2. Career Lake: Get Profile
    console.log('Testing /api/lake (GET)...');
    const lakeRes = await fetch(`${baseUrl}/lake`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(lakeRes.status, 200, 'Lake should return 200');
    const lakeData = await lakeRes.json();
    assert.strictEqual(lakeData.profile.name, 'Integration User');

    // 3. Career Lake: Add Experience
    console.log('Testing /api/lake/experiences (POST)...');
    const expRes = await fetch(`${baseUrl}/lake/experiences`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: 'Integration Corp',
        title: 'Tester',
        startDate: '2025-01-01',
        employmentType: 'full-time',
        domain: 'QA',
        location: 'Remote',
        description: 'Testing APIs'
      })
    });
    assert.strictEqual(expRes.status, 201, 'Experience creation should return 201');
    const expData = await expRes.json();
    assert.ok(expData.id, 'Experience should have ID');

    // 4. Job: Add Job
    console.log('Testing /api/jobs (POST)...');
    const jobRes = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: 'Target Corp',
        title: 'QA Engineer',
        location: 'Remote',
        seniority: 'Mid',
        employmentType: 'full-time',
        description: 'Need a QA',
        requirements: ['Testing'],
        rawText: 'Full job desc'
      })
    });
    assert.strictEqual(jobRes.status, 201, 'Job creation should return 201');
    const jobData = await jobRes.json();
    const jobId = jobData.id;
    assert.ok(jobId, 'Job should have ID');

    // 5. Auth: Invalid Login
    console.log('Testing /api/auth/login (Invalid)...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'integration@test.com', password: 'wrong' })
    });
    assert.strictEqual(loginRes.status, 401, 'Wrong password should return 401');

    console.log('API Integration Tests passed successfully!\n');
  } finally {
    await db.delete(schema.users).where(eq(schema.users.email, 'integration@test.com'));
    server.close();
  }
}
