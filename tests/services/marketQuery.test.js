import { describe, expect, it } from 'vitest';

import { applyMarketQuery, matchesTier, paginate, sortCoins } from '../../src/services/marketQuery.js';

const coin = (id, overrides = {}) => ({
  id,
  symbol: id.slice(0, 3),
  name: id,
  priceUsd: null,
  priceChangePercentage24h: null,
  marketCapUsd: null,
  totalVolumeUsd: null,
  ...overrides,
});

const coins = [
  coin('bitcoin', { symbol: 'btc', priceUsd: 67000, priceChangePercentage24h: 1.8, marketCapUsd: 1.3e12 }),
  coin('ethereum', { symbol: 'eth', priceUsd: 3200, priceChangePercentage24h: -0.9, marketCapUsd: 3.9e11 }),
  coin('tether', { symbol: 'usdt', priceUsd: 1, priceChangePercentage24h: 0, marketCapUsd: 1.1e11 }),
  coin('mid-coin', { symbol: 'mid', priceUsd: 5, priceChangePercentage24h: 4, marketCapUsd: 5e9 }),
  coin('tiny', { symbol: 'tny', priceUsd: 0.01, priceChangePercentage24h: -7, marketCapUsd: 2e8 }),
  coin('unknown', { symbol: 'unk' }),
];

const query = (overrides = {}) => ({
  search: undefined,
  movement: 'all',
  tier: 'all',
  sort: 'market_cap_desc',
  page: 1,
  perPage: 25,
  ...overrides,
});

const ids = (result) => result.items.map((c) => c.id);

describe('applyMarketQuery', () => {
  it('searches name and symbol case-insensitively', () => {
    expect(ids(applyMarketQuery(coins, query({ search: 'BTC' })))).toEqual(['bitcoin']);
    expect(ids(applyMarketQuery(coins, query({ search: 'Eth' })))).toEqual(['ethereum', 'tether']);
  });

  it('treats zero change as neither gainer nor loser', () => {
    expect(ids(applyMarketQuery(coins, query({ movement: 'gainers' })))).toEqual(['bitcoin', 'mid-coin']);
    expect(ids(applyMarketQuery(coins, query({ movement: 'losers' })))).toEqual(['ethereum', 'tiny']);
  });

  it('combines filters with sorting and pagination', () => {
    const result = applyMarketQuery(coins, query({ movement: 'losers', sort: 'change_24h_asc', perPage: 1 }));

    expect(ids(result)).toEqual(['tiny']);
    expect(result.pagination).toEqual({ page: 1, perPage: 1, totalItems: 2, totalPages: 2, hasNextPage: true });
  });
});

describe('matchesTier', () => {
  it('uses the documented thresholds and excludes unknown caps', () => {
    expect(matchesTier(coin('a', { marketCapUsd: 10e9 }), 'large')).toBe(true);
    expect(matchesTier(coin('a', { marketCapUsd: 9.99e9 }), 'mid')).toBe(true);
    expect(matchesTier(coin('a', { marketCapUsd: 1e9 }), 'mid')).toBe(true);
    expect(matchesTier(coin('a', { marketCapUsd: 0.99e9 }), 'small')).toBe(true);
    expect(matchesTier(coin('a'), 'small')).toBe(false);
    expect(matchesTier(coin('a'), 'all')).toBe(true);
  });
});

describe('sortCoins', () => {
  it('sorts both directions and always puts null values last', () => {
    expect(sortCoins(coins, 'price_desc').map((c) => c.id)).toEqual([
      'bitcoin',
      'ethereum',
      'mid-coin',
      'tether',
      'tiny',
      'unknown',
    ]);
    expect(sortCoins(coins, 'price_asc').map((c) => c.id).at(-1)).toBe('unknown');
  });

  it('does not mutate the input', () => {
    const copy = [...coins];
    sortCoins(coins, 'price_asc');
    expect(coins).toEqual(copy);
  });
});

describe('paginate', () => {
  it('handles empty results and pages past the end', () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      pagination: { page: 1, perPage: 10, totalItems: 0, totalPages: 0, hasNextPage: false },
    });
    expect(paginate([1, 2, 3], 5, 2).items).toEqual([]);
  });
});
