import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { toCoinDetails, toCoinSummaries, toGlobalStats, toPriceHistory } from '../../src/mappers/coinGeckoMapper.js';

// Trimmed copies of real CoinGecko responses (captured 2026-10-26), so the
// mapper is checked against the provider's actual format, not just
// hand-written samples. Only USD values were kept to keep the files small.
const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/coingecko/${name}.json`, import.meta.url), 'utf8'));

const isIsoDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

describe('mapper against real CoinGecko responses', () => {
  it('maps /coins/markets rows with every contract field', () => {
    const coins = toCoinSummaries(fixture('markets'));

    expect(coins).toHaveLength(3);
    expect(coins[0]).toMatchObject({ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', marketCapRank: 1 });
    for (const coin of coins) {
      expect(coin.priceUsd).toBeGreaterThan(0);
      expect(coin.marketCapUsd).toBeGreaterThan(0);
      expect(coin.totalVolumeUsd).toBeGreaterThan(0);
      expect(typeof coin.priceChangePercentage24h).toBe('number');
      expect(coin.imageUrl).toMatch(/^https:\/\//);
      expect(isIsoDate(coin.lastUpdated)).toBe(true);
    }
  });

  it('maps /coins/{id} including nested USD values and extremes', () => {
    const details = toCoinDetails(fixture('coin-ethereum'));

    expect(details).toMatchObject({ id: 'ethereum', symbol: 'eth', maxSupply: null });
    expect(details.priceUsd).toBeGreaterThan(0);
    expect(details.marketCapUsd).toBeGreaterThan(0);
    expect(details.circulatingSupply).toBeGreaterThan(0);
    expect(details.allTimeHigh.priceUsd).toBeGreaterThan(details.allTimeLow.priceUsd);
    expect(isIsoDate(details.allTimeHigh.date)).toBe(true);
    for (const period of ['1h', '24h', '7d', '14d', '30d', '60d', '200d', '1y']) {
      expect(typeof details.priceChangePercentages[period], period).toBe('number');
    }
  });

  it('maps /coins/{id}/market_chart into sorted points', () => {
    const history = toPriceHistory(fixture('market-chart-bitcoin-1d'), 'bitcoin', '1d');

    expect(history.points).toHaveLength(24);
    const timestamps = history.points.map((point) => point.timestamp);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(history.points.every((point) => point.priceUsd > 0)).toBe(true);
  });

  it('maps /global totals and dominance', () => {
    const stats = toGlobalStats(fixture('global'));

    expect(stats.totalMarketCapUsd).toBeGreaterThan(1e12);
    expect(stats.activeCryptocurrencies).toBeGreaterThan(1000);
    expect(stats.dominance[0].symbol).toBe('btc');
    expect(stats.dominance.length).toBeGreaterThanOrEqual(5);
    expect(isIsoDate(stats.updatedAt)).toBe(true);
  });
});
