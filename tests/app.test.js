import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/testApp.js';

describe('GET /api/v1/health', () => {
  it('reports that the server is running', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', dataSource: 'mock', version: 'test' });
    expect(res.body.data.uptimeSeconds).toBeTypeOf('number');
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    // Would break /api-docs when opened over plain HTTP (e.g. from a phone on the LAN).
    expect(res.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });
});

describe('unknown routes', () => {
  it('return the standard error envelope', async () => {
    const res = await request(createTestApp()).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'No endpoint for GET /api/v1/does-not-exist' },
    });
  });
});

describe('rate limiting', () => {
  it('rejects clients that exceed the limit with Retry-After', async () => {
    const app = createTestApp({ RATE_LIMIT_PER_MINUTE: '2' });

    await request(app).get('/api/v1/health');
    await request(app).get('/api/v1/health');
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBe('60');
  });

  it('cannot be bypassed by faking X-Forwarded-For when no proxy is configured', async () => {
    const app = createTestApp({ RATE_LIMIT_PER_MINUTE: '2' });

    const statuses = [];
    for (const fakeIp of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
      const res = await request(app).get('/api/v1/health').set('X-Forwarded-For', fakeIp);
      statuses.push(res.status);
    }

    expect(statuses).toEqual([200, 200, 429]);
  });

  it('uses the forwarded client IP when running behind a trusted proxy', async () => {
    const app = createTestApp({ RATE_LIMIT_PER_MINUTE: '1', TRUST_PROXY: '1' });

    const first = await request(app).get('/api/v1/health').set('X-Forwarded-For', '1.1.1.1');
    const otherClient = await request(app).get('/api/v1/health').set('X-Forwarded-For', '2.2.2.2');

    expect([first.status, otherClient.status]).toEqual([200, 200]);
  });
});
