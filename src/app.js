import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { createCoinController } from './controllers/coinController.js';
import { createDependencies } from './dependencies.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createApiDocsRouter } from './routes/apiDocsRoutes.js';
import { createHealthRouter } from './routes/healthRoutes.js';
import { createMarketRouter } from './routes/marketRoutes.js';
import { AppError } from './utils/AppError.js';

/**
 * Builds the Express app without starting a server. Tests import this and
 * call it with Supertest; server.js is the only file that opens a port.
 * Tests may pass their own `marketService` (e.g. one with a failing client).
 */
export function createApp({ config, logger, version = '1.0.0', marketService }) {
  const services = marketService ? { marketService } : createDependencies({ config, logger });
  const coinController = createCoinController({ ...services, dataSource: config.dataSource });

  const app = express();

  app.disable('x-powered-by');
  // Trust X-Forwarded-For only for the configured number of proxies (default
  // none); see TRUST_PROXY in config/env.js.
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      // The API runs over plain HTTP in development (emulators, phones on the
      // LAN). This directive would make browsers fetch the /api-docs assets
      // over HTTPS and break that page. HSTS still applies when served over HTTPS.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
    }),
  );
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));
  // Sensitive headers are redacted by the logger itself (utils/logger.js).
  app.use(pinoHttp({ logger }));

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
  app.use('/api/v1', createMarketRouter({ coinController }));
  app.use('/api-docs', createApiDocsRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
