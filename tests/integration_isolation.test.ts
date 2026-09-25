import assert from 'assert';
import http from 'http';

function apiRequest(path: string, options: any = {}) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const req = http.request('http://localhost:3000' + path, options, (res) => {
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

  // 1. User A Logs in
  const loginA = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'alex.costa@industrial-ops.com', password: 'CareerLake@2026' },
  });
  assert.strictEqual(loginA.status, 200);
  const tokenA = loginA.body.session.token;

  // 2. User A Creates a Private Job
  const createJobA = await apiRequest('/api/jobs', {
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
    },
  });
  assert.strictEqual(createJobA.status, 200);
  const jobAId = createJobA.body.job.id;

  // 3. User B Logs In
  const loginB = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'mariana.silva@biocareer.com', password: 'CareerLake@2026' },
  });
  assert.strictEqual(loginB.status, 200);
  const tokenB = loginB.body.session.token;

  // 4. User B attempts to access Job A via /api/jobs/:id/analysis
  const attemptAnalysis = await apiRequest(`/api/jobs/${jobAId}/analysis`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  // Should return null analysis (since Job A does not exist in User B's scope)
  assert.strictEqual(attemptAnalysis.body.analysis, null, 'User B must not see User A analysis');

  // 5. User B attempts to run fit analysis on User A's job
  const attemptRunAnalysis = await apiRequest('/api/analysis/fit', {
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
  const attemptDelete = await apiRequest(`/api/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.strictEqual(attemptDelete.body.success, false, 'User B must not be able to delete User A job');

  // 7. Clean up Job A using User A's token
  const deleteA = await apiRequest(`/api/jobs/${jobAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.strictEqual(deleteA.body.success, true, 'User A can delete their own job');

  console.log('    ✓ HTTP API cross-user access, mutation, and analysis strictly forbidden');
}
