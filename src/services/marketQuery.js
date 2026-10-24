// Pure functions that search, filter, sort and paginate coin summaries.
// No I/O, so they are easy to unit test and reason about.

export const LARGE_CAP_MIN_USD = 10e9;
export const MID_CAP_MIN_USD = 1e9;

/** Which summary field and direction each `sort` value uses. */
const SORT_FIELDS = {
  market_cap_desc: ['marketCapUsd', 'desc'],
  market_cap_asc: ['marketCapUsd', 'asc'],
  price_desc: ['priceUsd', 'desc'],
  price_asc: ['priceUsd', 'asc'],
  change_24h_desc: ['priceChangePercentage24h', 'desc'],
  change_24h_asc: ['priceChangePercentage24h', 'asc'],
  volume_desc: ['totalVolumeUsd', 'desc'],
  volume_asc: ['totalVolumeUsd', 'asc'],
};

export const SORT_OPTIONS = Object.keys(SORT_FIELDS);

export function matchesSearch(coin, search) {
  if (!search) return true;
  const term = search.toLowerCase();
  return coin.name.toLowerCase().includes(term) || coin.symbol.toLowerCase().includes(term);
}

export function matchesMovement(coin, movement) {
  const change = coin.priceChangePercentage24h;
  if (movement === 'gainers') return change !== null && change > 0;
  if (movement === 'losers') return change !== null && change < 0;
  return true;
}

/** Coins with an unknown market cap belong to no specific tier. */
export function matchesTier(coin, tier) {
  if (tier === 'all') return true;
  const cap = coin.marketCapUsd;
  if (cap === null) return false;
  if (tier === 'large') return cap >= LARGE_CAP_MIN_USD;
  if (tier === 'mid') return cap >= MID_CAP_MIN_USD && cap < LARGE_CAP_MIN_USD;
  return cap < MID_CAP_MIN_USD; // small
}

/** Returns a new sorted array. Null values always go last, in either direction. */
export function sortCoins(coins, sort) {
  const [field, direction] = SORT_FIELDS[sort];
  return [...coins].sort((a, b) => {
    const valueA = a[field];
    const valueB = b[field];
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return 1;
    if (valueB === null) return -1;
    return direction === 'desc' ? valueB - valueA : valueA - valueB;
  });
}

export function paginate(items, page, perPage) {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    pagination: { page, perPage, totalItems, totalPages, hasNextPage: page < totalPages },
  };
}

/** Applies the full listing query to the cached coin universe. */
export function applyMarketQuery(coins, { search, movement, tier, sort, page, perPage }) {
  const matching = coins
    .filter((coin) => matchesSearch(coin, search))
    .filter((coin) => matchesMovement(coin, movement))
    .filter((coin) => matchesTier(coin, tier));
  return paginate(sortCoins(matching, sort), page, perPage);
}
