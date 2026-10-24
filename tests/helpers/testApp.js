import { pino } from 'pino';

import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';

/** Builds an app with mock data and silent logs. Override any env var per test. */
export function createTestApp(envOverrides = {}) {
  const config = loadConfig({ NODE_ENV: 'test', DATA_SOURCE: 'mock', ...envOverrides });
  return createApp({ config, logger: pino({ level: 'silent' }), version: 'test' });
}
