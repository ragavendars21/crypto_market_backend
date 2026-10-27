import { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { createCoinGeckoClient } from '../../src/clients/coinGeckoClient.js';

const API_KEY = 'test-secret-key';

function reply(status, data = {}, headers = {}) {
  return (config) => {
    const response = { status, statusText: '', data, headers, config };
    if (status >= 200 && status < 300) return Promise.resolve(response);
    const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
    return Promise.reject(new AxiosError(`Request failed with status code ${status}`, code, config, {}, response));
  };
}

const timeout = () => (config) => Promise.reject(new AxiosError('timeout of 8000ms exceeded', 'ECONNABORTED', config));

const connectionReset = () => (config) => Promise.reject(new AxiosError('socket hang up', 'ECONNRESET', config));

function createClient(...responses) {
  const adapter = vi.fn();
  responses.forEach((response) => adapter.mockImplementationOnce(response));
  const client = createCoinGeckoClient({
    baseUrl: 'https://api.coingecko.test/api/v3',
    apiKey: API_KEY,
    timeoutMs: 8000,
    retryDelayMs: 0,
    adapter,
  });
  return { client, adapter };
}

describe('coinGeckoClient', () => {
  it('sends the API key header and the expected query parameters', async () => {
    const { client, adapter } = createClient(reply(200, []));

    await client.getMarkets({ ids: ['bitcoin', 'ethereum'], perPage: 2 });

    const config = adapter.mock.calls[0][0];
    expect(config.headers['x-cg-demo-api-key']).toBe(API_KEY);
    expect(config.url).toBe('/coins/markets');
    expect(config.params).toMatchObject({ vs_currency: 'usd', per_page: 2, ids: 'bitcoin,ethereum' });
  });

  it('requests a lean coin payload', async () => {
    const { client, adapter } = createClient(reply(200, {}));

    await client.getCoin('bitcoin');

    expect(adapter.mock.calls[0][0].params).toMatchObject({ tickers: false, community_data: false });
  });

  it('maps 404 on a coin path to COIN_NOT_FOUND', async () => {
    const { client } = createClient(reply(404, { error: 'coin not found' }));

    await expect(client.getCoin('nope')).rejects.toMatchObject({ status: 404, code: 'COIN_NOT_FOUND' });
  });

  it('maps 429 to UPSTREAM_RATE_LIMITED, honours Retry-After and does not retry', async () => {
    const { client, adapter } = createClient(reply(429, {}, { 'retry-after': '30' }));

    await expect(client.getGlobal()).rejects.toMatchObject({
      status: 503,
      code: 'UPSTREAM_RATE_LIMITED',
      retryAfterSeconds: 30,
    });
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('defaults Retry-After to 60 seconds when the header is missing', async () => {
    const { client } = createClient(reply(429));

    await expect(client.getGlobal()).rejects.toMatchObject({ retryAfterSeconds: 60 });
  });

  it('maps timeouts to UPSTREAM_TIMEOUT without retrying', async () => {
    const { client, adapter } = createClient(timeout());

    await expect(client.getGlobal()).rejects.toMatchObject({ status: 504, code: 'UPSTREAM_TIMEOUT' });
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('retries once after a 503 and returns the second response', async () => {
    const { client, adapter } = createClient(reply(503), reply(200, { data: { markets: 1 } }));

    await expect(client.getGlobal()).resolves.toEqual({ data: { markets: 1 } });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('retries once after a connection reset', async () => {
    const { client, adapter } = createClient(connectionReset(), reply(200, []));

    await expect(client.getMarkets()).resolves.toEqual([]);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('gives up after one retry with UPSTREAM_ERROR', async () => {
    const { client, adapter } = createClient(reply(502), reply(502));

    await expect(client.getGlobal()).rejects.toMatchObject({ status: 502, code: 'UPSTREAM_ERROR' });
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('does not retry other client errors and never leaks the API key', async () => {
    const { client, adapter } = createClient(reply(401, { error: `bad key ${API_KEY}` }));

    const error = await client.getGlobal().catch((e) => e);

    expect(error).toMatchObject({ status: 502, code: 'UPSTREAM_ERROR' });
    expect(error.message).not.toContain(API_KEY);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
