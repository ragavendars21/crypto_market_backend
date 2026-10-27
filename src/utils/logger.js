import { pino } from 'pino';

export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'err.config.headers["x-cg-demo-api-key"]',
  'err.config.headers.Authorization',
  'config.headers["x-cg-demo-api-key"]',
];

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
