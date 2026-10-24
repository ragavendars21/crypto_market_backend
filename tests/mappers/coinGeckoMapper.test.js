import { describe, expect, it } from 'vitest';

import { toCoinDetails, toCoinSummaries, toGlobalStats, toPriceHistory } from '../../src/mappers/coinGeckoMapper.js';

const expectUpstreamError = (fn) => expect(fn).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));

describe('toCoinSummaries', () => {
  it('maps CoinGecko market rows to the contract', () => {
    const [coin] = toCoinSummaries([
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://example.com/btc.png',
        current_price: 67012.5,
        market_cap: 1321000000000,
        market_cap_rank: 1,
        total_volume: 31200000000,
        price_change_24h: 1217.4,
        price_change_percentage_24h: 1.85,
        circulating_supply: 19712345,
        last_updated: '2026-10-23T10:14:31.123Z',
      },
    ]);

    expect(coin).toEqual({
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      imageUrl: 'https://example.com/btc.png',
      marketCapRank: 1,
      priceUsd: 67012.5,
      priceChange24hUsd: 1217.4,
      priceChangePercentage24h: 1.85,
      marketCapUsd: 1321000000000,
      totalVolumeUsd: 31200000000,
      circulatingSupply: 19712345,
      lastUpdated: '2026-10-23T10:14:31.123Z',
    });
  });

  it('turns missing or wrongly typed values into null, never 0', () => {
    const [coin] = toCoinSummaries([
      { id: 'x', symbol: 'x', name: 'X', current_price: '12.5', market_cap: null, total_volume: NaN, last_updated: 'nope' },
    ]);

    expect(coin.priceUsd).toBeNull();
    expect(coin.marketCapUsd).toBeNull();
    expect(coin.totalVolumeUsd).toBeNull();
    expect(coin.circulatingSupply).toBeNull();
    expect(coin.lastUpdated).toBeNull();
  });

  it('drops rows without an id, symbol or name', () => {
    const coins = toCoinSummaries([{ id: 'ok', symbol: 'ok', name: 'OK' }, { symbol: 'bad' }, null, 'junk']);

    expect(coins.map((c) => c.id)).toEqual(['ok']);
  });

  it('rejects a response that is not a list', () => {
    expectUpstreamError(() => toCoinSummaries({ error: 'something' }));
  });
});

describe('toCoinDetails', () => {
  const raw = {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: { large: 'https://example.com/eth.png' },
    market_cap_rank: 2,
    market_data: {
      current_price: { usd: 3285.4, eur: 3000 },
      market_cap: { usd: 3.95e11 },
      total_volume: { usd: 1.48e10 },
      circulating_supply: 120280000,
      total_supply: 120280000,
      max_supply: null,
      price_change_percentage_1h_in_currency: { usd: -0.08 },
      price_change_percentage_24h: -0.92,
      price_change_percentage_1y: 41.2,
      ath: { usd: 4878.26 },
      ath_change_percentage: { usd: -32.65 },
      ath_date: { usd: '2021-11-10T14:24:19.604Z' },
      last_updated: '2026-10-23T10:00:00.000Z',
    },
  };

  it('reads USD values out of the nested currency objects', () => {
    const details = toCoinDetails(raw);

    expect(details.priceUsd).toBe(3285.4);
    expect(details.marketCapUsd).toBe(3.95e11);
    expect(details.imageUrl).toBe('https://example.com/eth.png');
    expect(details.priceChangePercentages).toEqual({
      '1h': -0.08,
      '24h': -0.92,
      '7d': null,
      '14d': null,
      '30d': null,
      '60d': null,
      '200d': null,
      '1y': 41.2,
    });
    expect(details.allTimeHigh).toEqual({
      priceUsd: 4878.26,
      changePercentage: -32.65,
      date: '2021-11-10T14:24:19.604Z',
    });
  });

  it('keeps an uncapped supply as null and omits unknown extremes', () => {
    const details = toCoinDetails(raw);

    expect(details.maxSupply).toBeNull();
    expect(details.allTimeLow).toBeNull();
    expect(details.fullyDilutedValuationUsd).toBeNull();
  });

  it('survives a response without market_data', () => {
    const details = toCoinDetails({ id: 'x', symbol: 'x', name: 'X' });

    expect(details.priceUsd).toBeNull();
    expect(Object.values(details.priceChangePercentages).every((v) => v === null)).toBe(true);
  });

  it('rejects a response without the coin identity', () => {
    expectUpstreamError(() => toCoinDetails({ market_data: {} }));
  });
});

describe('toPriceHistory', () => {
  it('drops invalid points and sorts the rest oldest first', () => {
    const history = toPriceHistory(
      { prices: [[3000, 103], [1000, 100], [2000, null], ['x', 5], [4000.7, 104], 'junk'] },
      'bitcoin',
      '7d',
    );

    expect(history).toEqual({
      coinId: 'bitcoin',
      range: '7d',
      granularity: 'hourly',
      points: [
        { timestamp: 1000, priceUsd: 100 },
        { timestamp: 3000, priceUsd: 103 },
        { timestamp: 4000, priceUsd: 104 },
      ],
    });
  });

  it('returns an empty list rather than inventing points', () => {
    expect(toPriceHistory({ prices: [] }, 'x', '1d').points).toEqual([]);
  });

  it('rejects a response without a prices array', () => {
    expectUpstreamError(() => toPriceHistory({ status: 'error' }, 'x', '1d'));
  });
});

describe('toGlobalStats', () => {
  it('maps totals, sorts dominance and converts updated_at from seconds', () => {
    const stats = toGlobalStats({
      data: {
        active_cryptocurrencies: 17321,
        markets: 1287,
        total_market_cap: { usd: 2.41e12 },
        total_volume: { usd: 9.87e10 },
        market_cap_percentage: { eth: 16.4, btc: 54.8, bad: 'x' },
        market_cap_change_percentage_24h_usd: 1.42,
        updated_at: 1761213600,
      },
    });

    expect(stats).toEqual({
      totalMarketCapUsd: 2.41e12,
      totalVolumeUsd: 9.87e10,
      marketCapChangePercentage24h: 1.42,
      volumeChangePercentage24h: null,
      activeCryptocurrencies: 17321,
      markets: 1287,
      dominance: [
        { symbol: 'btc', percentage: 54.8 },
        { symbol: 'eth', percentage: 16.4 },
      ],
      updatedAt: '2025-10-23T10:00:00.000Z',
    });
  });

  it('rejects a response without the data wrapper', () => {
    expectUpstreamError(() => toGlobalStats({ total_market_cap: {} }));
  });
});
