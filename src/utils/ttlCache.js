/**
 * A small in-memory cache with per-entry expiry.
 *
 * Besides plain caching it does two things that protect the provider's
 * rate limit:
 *  1. Request sharing: if 10 requests for the same key arrive while the
 *     first upstream call is still running, they all wait for that one call.
 *  2. Stale fallback: if a refresh fails and an expired copy exists, the
 *     expired copy is returned (flagged `isStale`) instead of an error.
 *
 * It lives in one process only. With several server instances, Redis would
 * replace it behind the same `getOrLoad` method.
 */
export class TtlCache {
  constructor({ maxEntries = 500, now = Date.now } = {}) {
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map(); // key -> { value, fetchedAt, expiresAt }
    this.inFlight = new Map(); // key -> Promise
  }

  /**
   * Returns `{ value, cachedAt, isStale }` for `key`, calling `loader` only
   * when there is no fresh copy.
   *
   * `shouldServeStale(error)` decides which failures may fall back to an
   * expired copy. A "coin not found" error, for example, should not.
   */
  async getOrLoad(key, ttlMs, loader, { shouldServeStale = () => true } = {}) {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return toResult(cached, false);
    }

    if (!this.inFlight.has(key)) {
      const request = this.#load(key, ttlMs, loader).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, request);
    }

    try {
      return toResult(await this.inFlight.get(key), false);
    } catch (error) {
      const stale = this.entries.get(key);
      if (stale && shouldServeStale(error)) {
        return toResult(stale, true);
      }
      throw error;
    }
  }

  get size() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
    this.inFlight.clear();
  }

  async #load(key, ttlMs, loader) {
    const value = await loader();
    const fetchedAt = this.now();
    const entry = { value, fetchedAt, expiresAt: fetchedAt + ttlMs };

    // Re-insert so Map order reflects recency, then evict the oldest entry
    // if we are over the limit. This bounds memory use.
    this.entries.delete(key);
    this.entries.set(key, entry);
    if (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
    return entry;
  }
}

function toResult(entry, isStale) {
  return { value: entry.value, cachedAt: new Date(entry.fetchedAt).toISOString(), isStale };
}
