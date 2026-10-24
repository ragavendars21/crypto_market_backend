import { pino } from 'pino';

import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { createMarketService } from '../../src/services/marketService.js';
import { TtlCache } from '../../src/utils/ttlCache.js';

const silentLogger = pino({ level: 'silent' });

/** Builds an app with mock data and silent logs. Override any env var per test. */
export function createTestApp(envOverrides = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATA_SOURCE: 'mock', ...envOverrides });
  return createApp({ config, logger: silentLogger, version: 'test' });
}

/**
 * Builds an app around a hand-written client (e.g. one that fails), so
 * routes can be tested against provider errors without any network.
 */
export function createAppWithClient(client, { cache = new TtlCache() } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATA_SOURCE: 'mock' });
  const marketService = createMarketService({ client, cache });
  return createApp({ config, logger: silentLogger, version: 'test', marketService });
}
