const MINUTE_MS = 60_000;

export const CHART_RANGES = Object.freeze({
  '1d': { days: 1, granularity: '5m', cacheTtlMs: 2 * MINUTE_MS },
  '7d': { days: 7, granularity: 'hourly', cacheTtlMs: 10 * MINUTE_MS },
  '30d': { days: 30, granularity: 'hourly', cacheTtlMs: 10 * MINUTE_MS },
  '1y': { days: 365, granularity: 'daily', cacheTtlMs: 60 * MINUTE_MS },
});

export const CHART_RANGE_KEYS = Object.keys(CHART_RANGES);

export const CACHE_TTL_MS = Object.freeze({
  markets: 60_000,
  coinDetails: 60_000,
  global: 120_000,
});

export const MARKET_UNIVERSE_SIZE = 250;
