export class TtlCache {
  constructor({ maxEntries = 500, now = Date.now } = {}) {
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
    this.inFlight = new Map();
  }

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
