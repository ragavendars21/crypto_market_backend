import { readFileSync } from 'node:fs';

import { pino } from 'pino';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const logger = pino({
  level: config.logLevel,
  ...(config.nodeEnv === 'development' && { transport: { target: 'pino-pretty' } }),
});

const app = createApp({ config, logger, version });

const server = app.listen(config.port, () => {
  logger.info(`Crypto Market API listening on http://localhost:${config.port} (data source: ${config.dataSource})`);
});

// Finish in-flight requests before exiting (e.g. Ctrl+C or a container stop).
function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
