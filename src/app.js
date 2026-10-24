import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { AppError } from './utils/AppError.js';

/**
 * Builds the Express app without starting a server. Tests import this and
 * call it with Supertest; server.js is the only file that opens a port.
 */
export function createApp({ config, logger, version = '1.0.0' }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Correct client IPs for rate limiting behind one proxy.

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));
  app.use(
    pinoHttp({
      logger,
      // The API key is sent as a header to CoinGecko, never by our clients,
      // but redact auth-style headers anyway so logs stay safe.
      redact: ['req.headers.authorization', 'req.headers["x-cg-demo-api-key"]'],
    }),
  );

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res, next, options) =>
        next(
          new AppError({
            status: 429,
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.',
            retryAfterSeconds: Math.ceil(options.windowMs / 1000),
          }),
        ),
    }),
  );

  app.use('/api/v1/health', createHealthRouter({ config, version }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
