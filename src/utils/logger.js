import { pino } from 'pino';

/**
 * Header paths that must never appear in logs. The API key is only ever
 * sent to CoinGecko, but if an Axios error were logged as-is it would
 * carry the outgoing request headers, so those paths are censored too.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'err.config.headers["x-cg-demo-api-key"]',
  'err.config.headers.Authorization',
  'config.headers["x-cg-demo-api-key"]',
];

/** Creates the app logger. `destination` lets tests capture output. */
export function createLogger({ level, pretty = false }, destination) {
  return pino(
    {
      level,
      redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
      ...(pretty && { transport: { target: 'pino-pretty' } }),
    },
    destination,
  );
}
