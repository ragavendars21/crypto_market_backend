import { readFileSync } from 'node:fs';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createLogger } from './utils/logger.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const logger = createLogger({ level: config.logLevel, pretty: config.nodeEnv === 'development' });

const app = createApp({ config, logger, version });

const server = app.listen(config.port, () => {
  logger.info(`Crypto Market API listening on http://localhost:${config.port} (data source: ${config.dataSource})`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
