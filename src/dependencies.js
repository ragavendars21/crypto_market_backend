import { createCoinGeckoClient } from './clients/coinGeckoClient.js';
import { createMockCoinGeckoClient } from './clients/mockCoinGeckoClient.js';
import { createMarketService } from './services/marketService.js';
import { TtlCache } from './utils/ttlCache.js';

export function createDependencies({ config, logger }) {
  const client =
    config.dataSource === 'live'
      ? createCoinGeckoClient({ ...config.coinGecko, logger })
      : createMockCoinGeckoClient();

  return {
    marketService: createMarketService({ client, cache: new TtlCache() }),
  };
}
