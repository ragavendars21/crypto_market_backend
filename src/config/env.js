import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    // "mock" serves bundled fixture data and needs no API key.
    DATA_SOURCE: z.enum(['live', 'mock']).default('mock'),
    COINGECKO_BASE_URL: z.url().default('https://api.coingecko.com/api/v3'),
    COINGECKO_API_KEY: z.string().trim().optional(),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),

    // Comma-separated list of allowed browser origins, or "*" for any.
    CORS_ORIGIN: z.string().default('*'),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(120),
  })
  .superRefine((env, ctx) => {
    if (env.DATA_SOURCE === 'live' && !env.COINGECKO_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['COINGECKO_API_KEY'],
        message: 'is required when DATA_SOURCE=live',
      });
    }
  });

/**
 * Validates environment variables once at startup. A misconfigured server
 * should refuse to start rather than fail on the first request.
 * Error messages name the variable but never print its value.
 */
export function loadConfig(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const env = result.data;
  return Object.freeze({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    dataSource: env.DATA_SOURCE,
    coinGecko: Object.freeze({
      baseUrl: env.COINGECKO_BASE_URL,
      apiKey: env.COINGECKO_API_KEY,
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    }),
    corsOrigins: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
  });
}
