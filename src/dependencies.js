import { createCoinGeckoClient } from './clients/coinGeckoClient.js';
import { createMockCoinGeckoClient } from './clients/mockCoinGeckoClient.js';
import { createMarketService } from './services/marketService.js';
import { TtlCache } from './utils/ttlCache.js';

/**
 * Wires the app's objects together in one place. `DATA_SOURCE` only
 * decides which client is used; everything above the client is identical
 * in live and mock mode.
 */
export function createDependencies({ config, logger }) {
  const client =
    config.dataSource === 'live'
      ? createCoinGeckoClient({ ...config.coinGecko, logger })
      : createMockCoinGeckoClient();

  return {
    marketService: createMarketService({ client, cache: new TtlCache() }),
  };
}
