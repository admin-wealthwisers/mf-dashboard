/**
 * API smoke tests for MF Intelligence Dashboard
 * Uses Node.js built-in test runner (node:test)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, stopServer, generateToken, cleanup } from './setup.js';

let BASE_URL;
let serverProcess;
let adminToken;
let userToken;

before(async () => {
  const result = await startServer();
  BASE_URL = result.baseUrl;
  serverProcess = result.process;
  adminToken = await generateToken('admin@test.com', 'admin');
  userToken = await generateToken('user@test.com', 'user');
  console.log(`Test server running at ${BASE_URL}`);
});

after(() => {
  stopServer(serverProcess);
  cleanup();
});

// Helper: make request with optional auth cookie
async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Cookie = `mf-token=${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  }
  return { status: res.status, data, headers: res.headers };
}

// ─── Health ──────────────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /api/health returns 200', async () => {
    const { status, data } = await api('/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('GET /api/auth/me without token returns 401', async () => {
    const { status, data } = await api('/api/auth/me');
    assert.equal(status, 401);
    assert.ok(data.error);
  });

  it('GET /api/auth/me with valid admin token returns 200', async () => {
    const { status, data } = await api('/api/auth/me', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(data.data.email, 'admin@test.com');
    assert.equal(data.data.role, 'admin');
  });

  it('GET /api/auth/me with valid user token returns 200', async () => {
    const { status, data } = await api('/api/auth/me', { token: userToken });
    assert.equal(status, 200);
    assert.equal(data.data.email, 'user@test.com');
  });

  it('GET /api/auth/me with invalid token returns 401', async () => {
    const { status } = await api('/api/auth/me', { token: 'invalid.jwt.token' });
    assert.equal(status, 401);
  });
});

// ─── Schemes ─────────────────────────────────────────────────────────────────

describe('Schemes', () => {
  it('GET /api/schemes returns scheme list', async () => {
    const { status, data } = await api('/api/schemes', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 2);
  });

  it('GET /api/schemes?category=Large+Cap returns filtered results', async () => {
    const { status, data } = await api('/api/schemes?category=Large+Cap', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 1);
  });

  it('GET /api/schemes/:code returns single scheme', async () => {
    const { status, data } = await api('/api/schemes/100001', { token: adminToken });
    assert.equal(status, 200);
    assert.equal(data.data.scheme_code, '100001');
    assert.ok(data.data.scheme_name.includes('Large Cap'));
  });

  it('GET /api/schemes/999999999 returns 404', async () => {
    const { status, data } = await api('/api/schemes/999999999', { token: adminToken });
    assert.equal(status, 404);
    assert.ok(data.error);
  });
});

// ─── NAV ─────────────────────────────────────────────────────────────────────

describe('NAV', () => {
  it('GET /api/nav/:code returns NAV series', async () => {
    const { status, data } = await api('/api/nav/100001', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length > 0);
  });

  it('GET /api/nav/:code/latest returns latest NAV', async () => {
    const { status, data } = await api('/api/nav/100001/latest', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(data.data.nav);
    assert.ok(data.data.date);
  });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

describe('Analytics', () => {
  it('GET /api/analytics/risk/:code returns risk metrics', async () => {
    const { status, data } = await api('/api/analytics/risk/100001', { token: adminToken });
    assert.equal(status, 200);
    assert.ok('cagr' in data.data || 'volatility' in data.data);
  });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  it('GET /api/dashboard returns dashboard data', async () => {
    const { status, data } = await api('/api/dashboard', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(data.data.schemeCount >= 2);
    assert.ok(data.data.navCount > 0);
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

describe('Admin', () => {
  it('GET /api/admin/stats with admin token returns 200', async () => {
    const { status, data } = await api('/api/admin/stats', { token: adminToken });
    assert.equal(status, 200);
    assert.ok(data.data.schemes >= 2);
  });

  it('GET /api/admin/stats with user token returns 403', async () => {
    const { status, data } = await api('/api/admin/stats', { token: userToken });
    assert.equal(status, 403);
    assert.ok(data.error);
  });

  it('GET /api/admin/stats without token returns 401', async () => {
    const { status } = await api('/api/admin/stats');
    assert.equal(status, 401);
  });
});

// ─── Error handling ──────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('GET /api/nonexistent returns 404', async () => {
    const { status, data } = await api('/api/nonexistent', { token: adminToken });
    assert.equal(status, 404);
    assert.ok(data.error);
  });
});
