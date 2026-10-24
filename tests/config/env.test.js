import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('applies safe defaults for local development', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({ port: 3000, dataSource: 'mock', corsOrigins: '*' });
    expect(config.coinGecko.timeoutMs).toBe(8000);
  });

  it('requires an API key in live mode', () => {
    expect(() => loadConfig({ DATA_SOURCE: 'live' })).toThrow(/COINGECKO_API_KEY: is required/);
  });

  it('rejects invalid values', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ DATA_SOURCE: 'prod' })).toThrow(/DATA_SOURCE/);
  });

  it('never includes secret values in error messages', () => {
    const secret = 'super-secret-key';
    expect(() => loadConfig({ COINGECKO_API_KEY: secret, PORT: '-1' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secret) }),
    );
  });

  it('splits a comma-separated CORS origin list', () => {
    const config = loadConfig({ CORS_ORIGIN: 'http://localhost:5173, https://example.com' });

    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://example.com']);
  });
});
