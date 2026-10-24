/**
 * An error that is safe to show to API clients. Anything that is not an
 * AppError is treated as unexpected and returned as a generic 500.
 */
export class AppError extends Error {
  constructor({ status, code, message, details, retryAfterSeconds }) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
