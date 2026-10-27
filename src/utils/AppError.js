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
