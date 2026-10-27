import { AppError } from './AppError.js';

export const coinNotFound = () =>
  new AppError({ status: 404, code: 'COIN_NOT_FOUND', message: 'No coin exists with this ID.' });

export const upstreamRateLimited = (retryAfterSeconds) =>
  new AppError({
    status: 503,
    code: 'UPSTREAM_RATE_LIMITED',
    message: 'The market data provider is busy. Please try again shortly.',
    retryAfterSeconds,
  });

export const upstreamTimeout = () =>
  new AppError({
    status: 504,
    code: 'UPSTREAM_TIMEOUT',
    message: 'The market data provider took too long to respond.',
  });

export const upstreamError = (message = 'The market data provider is unavailable.') =>
  new AppError({ status: 502, code: 'UPSTREAM_ERROR', message });

export const malformedUpstreamResponse = () =>
  upstreamError('The market data provider returned an unexpected response.');

export const isUpstreamFailure = (error) =>
  error instanceof AppError && ['UPSTREAM_RATE_LIMITED', 'UPSTREAM_TIMEOUT', 'UPSTREAM_ERROR'].includes(error.code);
