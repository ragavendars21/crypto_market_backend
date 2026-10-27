import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { coinNotFound, upstreamRateLimited, upstreamTimeout } from '../../src/utils/upstreamErrors.js';
import { TtlCache } from '../../src/utils/ttlCache.js';
import { createAppWithClient, createTestApp } from '../helpers/testApp.js';

const app = createTestApp();
const ids = (res) => res.body.data.map((coin) => coin.id);

describe('GET /api/v1/coins', () => {
  it('returns the first page by market cap with pagination meta', async () => {
    const res = await request(app).get('/api/v1/coins?perPage=3');

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(['bitcoin', 'ethereum', 'tether']);
    expect(res.body.meta).toMatchObject({
      source: 'mock',
      page: 1,
      perPage: 3,
      totalItems: 24,
      totalPages: 8,
      hasNextPage: true,
      universeSize: 250,
    });
    expect(res.body.meta.cachedAt).toEqual(expect.any(String));
  });

  it('returns coins in the contract shape', async () => {
    const res = await request(app).get('/api/v1/coins?perPage=1');

    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      [
        'id',
        'symbol',
        'name',
        'imageUrl',
        'marketCapRank',
        'priceUsd',
        'priceChange24hUsd',
        'priceChangePercentage24h',
        'marketCapUsd',
        'totalVolumeUsd',
        'circulatingSupply',
        'lastUpdated',
      ].sort(),
    );
  });

  it('searches, filters and sorts on the server', async () => {
    const res = await request(app).get('/api/v1/coins?search=coin&movement=gainers&sort=change_24h_desc');

    expect(ids(res)).toEqual(['dogecoin', 'bitcoin', 'bitcoin-cash', 'litecoin']);
  });

  it('sorts by price, which CoinGecko itself cannot do', async () => {
    const res = await request(app).get('/api/v1/coins?sort=price_asc&perPage=2');

    expect(ids(res)).toEqual(['pepe', 'shiba-inu']);
  });

  it('filters by market-cap tier', async () => {
    const res = await request(app).get('/api/v1/coins?tier=small');

    expect(ids(res)).toEqual(['decentraland', 'basic-attention-token']);
  });

  it('returns 200 with an empty list when nothing matches', async () => {
    const res = await request(app).get('/api/v1/coins?search=zzzz');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ totalItems: 0, hasNextPage: false });
  });

  it('looks up coins by ID for the watchlist, skipping unknown IDs', async () => {
    const res = await request(app).get('/api/v1/coins?ids=solana,bitcoin,not-a-coin&sort=price_asc');

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(['solana', 'bitcoin']);
    expect(res.body.meta.page).toBeUndefined();
  });

  it.each([
    ['perPage=101', 'perPage'],
    ['page=0', 'page'],
    ['sort=popularity', 'sort'],
    ['tier=huge', 'tier'],
    [`search=${'a'.repeat(51)}`, 'search'],
    ['ids=Bitcoin!', 'ids.0'],
    ['ids=bitcoin&search=btc', 'search'],
    ['srot=price_desc', 'srot'],
  ])('rejects invalid query %s', async (queryString, field) => {
    const res = await request(app).get(`/api/v1/coins?${queryString}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  it('rejects repeated query parameters', async () => {
    const res = await request(app).get('/api/v1/coins?sort=price_asc&sort=price_desc');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/coins/:coinId', () => {
  it('returns coin details', async () => {
    const res = await request(app).get('/api/v1/coins/bitcoin');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'bitcoin', maxSupply: 21000000, marketCapRank: 1 });
    expect(res.body.data.priceChangePercentages['1y']).toBe(98.7);
  });

  it('returns null for values the provider does not have', async () => {
    const res = await request(app).get('/api/v1/coins/ethereum');

    expect(res.body.data.maxSupply).toBeNull();
  });

  it('returns 404 for an unknown coin', async () => {
    const res = await request(app).get('/api/v1/coins/not-a-coin');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COIN_NOT_FOUND');
  });

  it('rejects a malformed coin ID before calling the provider', async () => {
    const res = await request(app).get('/api/v1/coins/BAD_ID');

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('coinId');
  });
});

describe('GET /api/v1/coins/:coinId/market-chart', () => {
  it.each([
    ['1d', '5m', 288],
    ['7d', 'hourly', 168],
    ['30d', 'hourly', 720],
    ['1y', 'daily', 365],
  ])('returns %s history with %s granularity', async (range, granularity, pointCount) => {
    const res = await request(app).get(`/api/v1/coins/bitcoin/market-chart?range=${range}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ coinId: 'bitcoin', range, granularity });
    expect(res.body.data.points).toHaveLength(pointCount);
  });

  it('keeps mock charts consistent with the coin\'s reported change', async () => {
    const [chart, details] = await Promise.all([
      request(app).get('/api/v1/coins/bitcoin/market-chart?range=7d'),
      request(app).get('/api/v1/coins/bitcoin'),
    ]);
    const points = chart.body.data.points;
    const chartChange = (points.at(-1).priceUsd / points[0].priceUsd - 1) * 100;

    expect(chartChange).toBeCloseTo(details.body.data.priceChangePercentages['7d'], 6);
    expect(points.at(-1).priceUsd).toBeCloseTo(details.body.data.priceUsd, 6);
  });

  it('returns few or no points for a newly listed coin', async () => {
    const res = await request(app).get('/api/v1/coins/sample-new-coin/market-chart?range=1y');

    expect(res.status).toBe(200);
    expect(res.body.data.points.length).toBeLessThan(2);
  });

  it.each(['', '?range=max', '?range=1d&extra=1'])('rejects unsupported query "%s"', async (queryString) => {
    const res = await request(app).get(`/api/v1/coins/bitcoin/market-chart${queryString}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/market/global', () => {
  it('returns global statistics with dominance largest first', async () => {
    const res = await request(app).get('/api/v1/market/global');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalMarketCapUsd: 2.41e12, activeCryptocurrencies: 17321 });
    expect(res.body.data.dominance[0]).toEqual({ symbol: 'btc', percentage: 54.8 });
  });
});

describe('provider failures', () => {
  const failingClient = (error) => ({
    getMarkets: vi.fn().mockRejectedValue(error),
    getCoin: vi.fn().mockRejectedValue(error),
    getMarketChart: vi.fn().mockRejectedValue(error),
    getGlobal: vi.fn().mockRejectedValue(error),
  });

  it('returns 503 with Retry-After when the provider is rate limited', async () => {
    const res = await request(createAppWithClient(failingClient(upstreamRateLimited(30)))).get('/api/v1/market/global');

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBe('30');
    expect(res.body.error.code).toBe('UPSTREAM_RATE_LIMITED');
  });

  it('returns 504 when the provider times out', async () => {
    const res = await request(createAppWithClient(failingClient(upstreamTimeout()))).get('/api/v1/coins');

    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('returns 502 when the provider sends an unexpected response', async () => {
    const client = failingClient(new Error('unused'));
    client.getGlobal = vi.fn().mockResolvedValue('<html>maintenance</html>');

    const res = await request(createAppWithClient(client)).get('/api/v1/market/global');

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('serves the last cached copy, marked stale, when a refresh fails', async () => {
    let now = 0;
    const cache = new TtlCache({ now: () => now });
    const client = failingClient(upstreamTimeout());
    client.getGlobal = vi
      .fn()
      .mockResolvedValueOnce({ data: { markets: 1287 } })
      .mockRejectedValueOnce(upstreamTimeout());
    const staleApp = createAppWithClient(client, { cache });

    await request(staleApp).get('/api/v1/market/global');
    now += 10 * 60_000;
    const res = await request(staleApp).get('/api/v1/market/global');

    expect(res.status).toBe(200);
    expect(res.body.data.markets).toBe(1287);
    expect(res.body.meta.source).toBe('stale');
  });

  it('never serves stale data for a coin that does not exist', async () => {
    const res = await request(createAppWithClient(failingClient(coinNotFound()))).get('/api/v1/coins/gone');

    expect(res.status).toBe(404);
  });

  it('calls the provider once for many listing requests within the cache window', async () => {
    const client = failingClient(new Error('unused'));
    client.getMarkets = vi.fn().mockResolvedValue([{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }]);
    const cachedApp = createAppWithClient(client);

    await Promise.all([
      request(cachedApp).get('/api/v1/coins'),
      request(cachedApp).get('/api/v1/coins?sort=price_desc'),
      request(cachedApp).get('/api/v1/coins?search=btc'),
    ]);

    expect(client.getMarkets).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api-docs', () => {
  it('serves the OpenAPI spec', async () => {
    const res = await request(app).get('/api-docs/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(Object.keys(res.body.paths)).toContain('/api/v1/coins/{coinId}/market-chart');
  });
});
