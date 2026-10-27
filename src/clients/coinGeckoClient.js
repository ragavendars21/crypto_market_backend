import axios from 'axios';

import { AppError } from '../utils/AppError.js';
import { coinNotFound, upstreamError, upstreamRateLimited, upstreamTimeout } from '../utils/upstreamErrors.js';

const DEFAULT_RETRY_AFTER_SECONDS = 60;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

export function createCoinGeckoClient({ baseUrl, apiKey, timeoutMs, logger, retryDelayMs = 500, adapter }) {
  const http = axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: { Accept: 'application/json', 'x-cg-demo-api-key': apiKey },
    ...(adapter && { adapter }),
  });

  async function request(path, params, { isCoinPath = false } = {}) {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await http.get(path, { params });
        return response.data;
      } catch (error) {
        if (attempt === 1 && isRetryable(error)) {
          logger?.warn({ path, status: error.response?.status }, 'CoinGecko request failed, retrying once');
          await delay(retryDelayMs);
          continue;
        }
        throw normalizeError(error, { path, isCoinPath, logger });
      }
    }
  }

  return {
    getMarkets({ ids, perPage = 250, page = 1 } = {}) {
      return request('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page,
        sparkline: false,
        price_change_percentage: '24h',
        ...(ids?.length && { ids: ids.join(',') }),
      });
    },

    getCoin(coinId) {
      return request(
        `/coins/${encodeURIComponent(coinId)}`,
        {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
        { isCoinPath: true },
      );
    },

    getMarketChart(coinId, days) {
      return request(
        `/coins/${encodeURIComponent(coinId)}/market_chart`,
        { vs_currency: 'usd', days },
        { isCoinPath: true },
      );
    },

    getGlobal() {
      return request('/global', {});
    },
  };
}

function isRetryable(error) {
  if (!axios.isAxiosError(error) || isTimeout(error)) return false;
  return !error.response || RETRYABLE_STATUSES.has(error.response.status);
}

function isTimeout(error) {
  return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
}

function normalizeError(error, { path, isCoinPath, logger }) {
  if (error instanceof AppError) return error;
  if (!axios.isAxiosError(error)) return upstreamError();

  if (isTimeout(error)) return upstreamTimeout();

  const status = error.response?.status;
  if (status === 404 && isCoinPath) return coinNotFound();
  if (status === 429) {
    logger?.warn({ path }, 'CoinGecko rate limit reached');
    return upstreamRateLimited(parseRetryAfter(error.response.headers?.['retry-after']));
  }
  if (status === 401 || status === 403) {
    logger?.error({ path, status }, 'CoinGecko rejected the request; check COINGECKO_API_KEY');
  } else {
    logger?.warn({ path, status, code: error.code }, 'CoinGecko request failed');
  }
  return upstreamError();
}

function parseRetryAfter(value) {
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
