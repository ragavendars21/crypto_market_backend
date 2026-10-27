import { pino } from 'pino';

import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { createMarketService } from '../../src/services/marketService.js';
import { TtlCache } from '../../src/utils/ttlCache.js';

const silentLogger = pino({ level: 'silent' });

export function createTestApp(envOverrides = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATA_SOURCE: 'mock', ...envOverrides });
  return createApp({ config, logger: silentLogger, version: 'test' });
}

export function createAppWithClient(client, { cache = new TtlCache() } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATA_SOURCE: 'mock' });
  const marketService = createMarketService({ client, cache });
  return createApp({ config, logger: silentLogger, version: 'test', marketService });
}
