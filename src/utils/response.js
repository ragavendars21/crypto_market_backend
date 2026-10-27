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
