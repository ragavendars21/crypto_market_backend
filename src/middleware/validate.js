import { AppError } from '../utils/AppError.js';

export function validate({ params, query }) {
  return (req, res, next) => {
    const details = [];
    req.validated = {};

    for (const [location, schema] of [
      ['params', params],
      ['query', query],
    ]) {
      if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (result.success) {
        req.validated[location] = result.data;
      } else {
        details.push(...result.error.issues.map((issue) => toDetail(issue, location)));
      }
    }

    if (details.length > 0) {
      return next(
        new AppError({ status: 400, code: 'VALIDATION_ERROR', message: 'Invalid request parameters.', details }),
      );
    }
    next();
  };
}

function toDetail(issue, location) {
  if (issue.code === 'unrecognized_keys') {
    return { field: issue.keys.join(', '), message: `Unknown ${location} parameter` };
  }
  return { field: issue.path.join('.') || location, message: issue.message };
}
