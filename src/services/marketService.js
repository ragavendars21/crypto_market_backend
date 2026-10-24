import { CACHE_TTL_MS, CHART_RANGES, MARKET_UNIVERSE_SIZE } from '../config/marketData.js';
import { toCoinDetails, toCoinSummaries, toGlobalStats, toPriceHistory } from '../mappers/coinGeckoMapper.js';
import { isUpstreamFailure } from '../utils/upstreamErrors.js';
import { applyMarketQuery, sortCoins } from './marketQuery.js';

/**
 * Market data use cases. Each method returns `{ value, cachedAt, isStale }`
 * so controllers can fill in the response `meta`.
 *
 * The `client` is either the live CoinGecko client or the mock client;
 * this service does not know or care which.
 */
export function createMarketService({ client, cache }) {
  const cached = (key, ttlMs, loader) => cache.getOrLoad(key, ttlMs, loader, { shouldServeStale: isUpstreamFailure });

  /**
   * CoinGecko can only sort by market cap, volume or ID, so we fetch the
   * top coins once (cached for 60s) and search/filter/sort/paginate them
   * here. One upstream call per minute serves every listing request.
   */
  async function listCoins(query) {
    const universe = await cached('markets:top', CACHE_TTL_MS.markets, async () =>
      toCoinSummaries(await client.getMarkets({ perPage: MARKET_UNIVERSE_SIZE, page: 1 })),
    );
    const { items, pagination } = applyMarketQuery(universe.value, query);
    return { ...universe, value: items, pagination: { ...pagination, universeSize: MARKET_UNIVERSE_SIZE } };
  }

  /** Watchlist lookups: coins may be outside the top list, so ask for them directly. */
  async function getCoinsByIds(ids, sort) {
    const sortedIds = [...new Set(ids)].sort();
    const result = await cached(`markets:ids:${sortedIds.join(',')}`, CACHE_TTL_MS.markets, async () =>
      toCoinSummaries(await client.getMarkets({ ids: sortedIds, perPage: sortedIds.length, page: 1 })),
    );
    return { ...result, value: sortCoins(result.value, sort) };
  }

  function getCoinDetails(coinId) {
    return cached(`coin:${coinId}`, CACHE_TTL_MS.coinDetails, async () =>
      toCoinDetails(await client.getCoin(coinId)),
    );
  }

  function getMarketChart(coinId, range) {
    const { days, cacheTtlMs } = CHART_RANGES[range];
    return cached(`chart:${coinId}:${range}`, cacheTtlMs, async () =>
      toPriceHistory(await client.getMarketChart(coinId, days), coinId, range),
    );
  }

  function getGlobalStats() {
    return cached('global', CACHE_TTL_MS.global, async () => toGlobalStats(await client.getGlobal()));
  }

  return { listCoins, getCoinsByIds, getCoinDetails, getMarketChart, getGlobalStats };
}
