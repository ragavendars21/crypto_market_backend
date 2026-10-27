import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(
    new AppError({
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      message: `No endpoint for ${req.method} ${req.path}`,
    }),
  );
}

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

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed request body.' } });
  }

  req.log?.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
  });
}
