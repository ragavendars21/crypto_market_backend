import { Writable } from 'node:stream';

import { AxiosError } from 'axios';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../src/utils/logger.js';
import { createAppWithClient } from './helpers/testApp.js';

const SECRET = 'CG-test-secret-key';

/** A logger that writes JSON lines into an array. */
function captureLogger() {
  const lines = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  return { logger: createLogger({ level: 'info' }, destination), lines };
}

describe('security', () => {
  it('returns a generic 500 without internal details for unexpected errors', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('db password=hunter2 at internal.js:42'));
    const app = createAppWithClient({
      getMarkets: failing,
      getCoin: failing,
      getMarketChart: failing,
      getGlobal: failing,
    });

    const res = await request(app).get('/api/v1/market/global');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|internal\.js/);
  });

  it('never writes the CoinGecko key to logs, even inside an Axios error', () => {
    const { logger, lines } = captureLogger();
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', {
      headers: { 'x-cg-demo-api-key': SECRET, Accept: 'application/json' },
    });

    logger.error({ err: error }, 'Upstream failed');

    const output = lines.join('');
    expect(output).toContain('Upstream failed');
    expect(output).not.toContain(SECRET);
    expect(output).toContain('[REDACTED]');
  });

  it('redacts authorization and cookie headers on incoming requests', () => {
    const { logger, lines } = captureLogger();

    logger.info({ req: { headers: { authorization: 'Bearer abc', cookie: 'session=xyz' } } }, 'request');

    const output = lines.join('');
    expect(output).not.toMatch(/Bearer abc|session=xyz/);
  });

  it('does not expose stack traces for malformed query strings', async () => {
    const app = createAppWithClient({});

    const res = await request(app).get('/api/v1/coins?page[$gt]=1');

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|node_modules/);
  });
});
