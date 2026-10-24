/**
 * Sends the contract's success envelope: `{ data, meta }`.
 * `source` is "stale" when the cache served an expired copy, otherwise the
 * configured data source ("live" or "mock").
 */
export function sendData(res, { data, cachedAt, isStale, dataSource, extraMeta = {} }) {
  res.json({
    data,
    meta: {
      source: isStale ? 'stale' : dataSource,
      cachedAt: cachedAt ?? null,
      ...extraMeta,
    },
  });
}
