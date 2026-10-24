import { describe, expect, it, vi } from 'vitest';

import { TtlCache } from '../../src/utils/ttlCache.js';

function createClock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms) => (time += ms) };
}

describe('TtlCache', () => {
  it('returns the cached value until it expires', async () => {
    const clock = createClock();
    const cache = new TtlCache({ now: clock.now });
    const loader = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    expect((await cache.getOrLoad('key', 1000, loader)).value).toBe('first');
    clock.advance(999);
    expect((await cache.getOrLoad('key', 1000, loader)).value).toBe('first');
    clock.advance(1);
    expect((await cache.getOrLoad('key', 1000, loader)).value).toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('reports when the value was fetched', async () => {
    const cache = new TtlCache({ now: () => Date.parse('2026-10-23T10:00:00.000Z') });

    const result = await cache.getOrLoad('key', 1000, async () => 'value');

    expect(result).toEqual({ value: 'value', cachedAt: '2026-10-23T10:00:00.000Z', isStale: false });
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache();
    let resolveLoad;
    const loader = vi.fn(() => new Promise((resolve) => (resolveLoad = resolve)));

    const requests = [cache.getOrLoad('key', 1000, loader), cache.getOrLoad('key', 1000, loader)];
    resolveLoad('shared');

    expect((await Promise.all(requests)).map((r) => r.value)).toEqual(['shared', 'shared']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('serves the expired copy, flagged stale, when a refresh fails', async () => {
    const clock = createClock();
    const cache = new TtlCache({ now: clock.now });
    await cache.getOrLoad('key', 1000, async () => 'old');
    clock.advance(5000);

    const result = await cache.getOrLoad('key', 1000, async () => {
      throw new Error('provider down');
    });

    expect(result).toMatchObject({ value: 'old', isStale: true });
  });

  it('rethrows when stale data is not allowed for that error', async () => {
    const clock = createClock();
    const cache = new TtlCache({ now: clock.now });
    await cache.getOrLoad('key', 1000, async () => 'old');
    clock.advance(5000);

    const failing = cache.getOrLoad(
      'key',
      1000,
      async () => {
        throw new Error('not found');
      },
      { shouldServeStale: () => false },
    );

    await expect(failing).rejects.toThrow('not found');
  });

  it('rethrows when there is no copy to fall back to', async () => {
    const cache = new TtlCache();

    await expect(
      cache.getOrLoad('key', 1000, async () => {
        throw new Error('provider down');
      }),
    ).rejects.toThrow('provider down');
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry when full', async () => {
    const cache = new TtlCache({ maxEntries: 2 });
    for (const key of ['a', 'b', 'c']) {
      await cache.getOrLoad(key, 1000, async () => key);
    }

    expect(cache.size).toBe(2);
    expect([...cache.entries.keys()]).toEqual(['b', 'c']);
  });
});
