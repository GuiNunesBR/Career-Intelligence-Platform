import assert from 'assert';
import http from 'http';
import { app } from '../server/app.js';

function apiRequest(port: number, path: string, options: any = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = http.request('http://localhost:' + port + path, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

export async function runIntegrationIsolationTest(): Promise<void> {
  console.log('  [TEST SUITE] End-to-End Cross-User Isolation (User A vs User B)');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = (server.address() as any).port;

  try {
    // 1. User A Logs in (wait, we need to register first!)
    const userAEmail = `alex_${Date.now()}@industrial-ops.com`;
    const userBEmail = `mariana_${Date.now()}@biocareer.com`;
    
    await apiRequest(port, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: userAEmail, name: 'Alex', password: 'CareerLake@2026' },
    });
    
    await apiRequest(port, '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: userBEmail, name: 'Mariana', password: 'CareerLake@2026' },
    });

    const loginA = await apiRequest(port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: userAEmail, password: 'CareerLake@2026' },
    });
    assert.strictEqual(loginA.status, 200);
  const tokenA = loginA.body.session.token;

    // 2. User A Creates a Private Job
    const createJobA = await apiRequest(port, '/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: {
      company: 'User A Secret Tech',
      title: 'Confidential Strategy Lead',
      location: 'Curitiba',
      seniority: 'Lead',
      employmentType: 'Full-time',
      description: 'Private Capex portfolio',
      requirements: [
        {
          requirementId: 'req_confidential',
          category: 'Functional',
          description: 'Secret portfolio control',
          importance: 'critical',
          evidenceRequired: 'Audit proof',
        },
      ],
      rawText: 'Confidential strategy lead job posting with private capex portfolio focus',
    },
  });
  assert.strictEqual(createJobA.status, 201);
  const jobAId = createJobA.body.job.id;

    // 3. User B Logs In
    const loginB = await apiRequest(port, '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: userBEmail, password: 'CareerLake@2026' },
    });
  assert.strictEqual(loginB.status, 200);
  const tokenB = loginB.body.session.token;

    // 4. User B attempts to access Job A via /api/jobs/:id/analysis
    const attemptAnalysis = await apiRequest(port, `/api/jobs/${jobAId}/analysis`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  // Should return null analysis (since Job A does not exist in User B's scope)
  assert.strictEqual(attemptAnalysis.body.analysis, null, 'User B must not see User A analysis');

    // 5. User B attempts to run fit analysis on User A's job
    const attemptRunAnalysis = await apiRequest(port, '/api/analysis/fit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: { jobId: jobAId },
  });
  assert.ok(
    attemptRunAnalysis.status >= 400,
    `User B running fit on User A job must fail with 4xx, got ${attemptRunAnalysis.status}`
  );

    // 6. User B attempts to delete User A's job
    const attemptDelete = await apiRequest(port, `/api/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(attemptDelete.body.success, false, 'User B must not be able to delete User A job');

    // 7. Clean up Job A using User A's token
    const deleteA = await apiRequest(port, `/api/jobs/${jobAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(deleteA.body.success, true, 'User A can delete their own job');

    console.log('    ✓ HTTP API cross-user access, mutation, and analysis strictly forbidden');
  } finally {
    server.close();
  }
}
