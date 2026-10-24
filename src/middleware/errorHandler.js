import { AppError } from '../utils/AppError.js';

/** Catches requests that matched no route. */
export function notFoundHandler(req, res, next) {
  next(
    new AppError({
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      message: `No endpoint for ${req.method} ${req.path}`,
    }),
  );
}

/**
 * Turns every error into the contract's error envelope. Express 5 forwards
 * rejected promises from async handlers here automatically.
 * Unexpected errors are logged in full but the client only sees a generic
 * message, so stack traces and internal details never leak.
 */
// Express identifies error middleware by its four parameters, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.retryAfterSeconds) {
      res.set('Retry-After', String(err.retryAfterSeconds));
    }
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Malformed JSON bodies and similar errors raised by Express/body parsers.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed request body.' } });
  }

  req.log?.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
  });
}
