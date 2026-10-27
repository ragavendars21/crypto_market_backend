import {
  MOCK_DETAIL_EXTRAS,
  MOCK_GLOBAL,
  MOCK_LAST_UPDATED,
  MOCK_LISTING_AGE_MS,
  MOCK_MARKETS,
} from '../fixtures/mockMarketData.js';
import { coinNotFound } from '../utils/upstreamErrors.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function createMockCoinGeckoClient() {
  const findMarket = (coinId) => {
    const row = MOCK_MARKETS.find((coin) => coin.id === coinId);
    if (!row) throw coinNotFound();
    return row;
  };

  return {
    async getMarkets({ ids, perPage = 250, page = 1 } = {}) {
      const rows = ids?.length ? MOCK_MARKETS.filter((coin) => ids.includes(coin.id)) : MOCK_MARKETS;
      return structuredClone(rows.slice((page - 1) * perPage, page * perPage));
    },

    async getCoin(coinId) {
      return buildRawCoin(findMarket(coinId));
    },

    async getMarketChart(coinId, days) {
      const row = findMarket(coinId);
      return { prices: generatePrices(row, days), market_caps: [], total_volumes: [] };
    },

    async getGlobal() {
      return structuredClone(MOCK_GLOBAL);
    },
  };
}

function buildRawCoin(row) {
  const extras = MOCK_DETAIL_EXTRAS[row.id] ?? {};
  const changes = extras.changes ?? {};
  const usd = (value) => ({ usd: value ?? null });

  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    image: { thumb: row.image, small: row.image, large: row.image },
    market_cap_rank: row.market_cap_rank,
    market_data: {
      current_price: usd(row.current_price),
      market_cap: usd(row.market_cap),
      fully_diluted_valuation: usd(extras.fully_diluted_valuation),
      total_volume: usd(row.total_volume),
      high_24h: usd(row.high_24h),
      low_24h: usd(row.low_24h),
      circulating_supply: row.circulating_supply,
      total_supply: extras.total_supply ?? null,
      max_supply: extras.max_supply ?? null,
      price_change_percentage_1h_in_currency: usd(changes['1h']),
      price_change_percentage_24h: row.price_change_percentage_24h,
      price_change_percentage_7d: changes['7d'] ?? null,
      price_change_percentage_14d: changes['14d'] ?? null,
      price_change_percentage_30d: changes['30d'] ?? null,
      price_change_percentage_60d: changes['60d'] ?? null,
      price_change_percentage_200d: changes['200d'] ?? null,
      price_change_percentage_1y: changes['1y'] ?? null,
      ath: usd(extras.ath?.price),
      ath_change_percentage: usd(extras.ath?.change),
      ath_date: usd(extras.ath?.date),
      atl: usd(extras.atl?.price),
      atl_change_percentage: usd(extras.atl?.change),
      atl_date: usd(extras.atl?.date),
      last_updated: MOCK_LAST_UPDATED,
    },
    last_updated: MOCK_LAST_UPDATED,
  };
}

function generatePrices(row, days) {
  if (row.current_price === null) return [];

  const [count, stepMs, volatility] =
    days <= 1 ? [288, 5 * MINUTE_MS, 0.002] : days <= 90 ? [days * 24, HOUR_MS, 0.006] : [days, DAY_MS, 0.03];

  const random = seededRandom(`${row.id}:${days}`);
  const end = Date.parse(MOCK_LAST_UPDATED);
  const listingAge = MOCK_LISTING_AGE_MS[row.id];
  const listedAt = listingAge === undefined ? -Infinity : end - listingAge;

  const prices = new Array(count).fill(row.current_price);
  for (let i = count - 2; i >= 0; i--) {
    prices[i] = prices[i + 1] / (1 + (random() * 2 - 1) * volatility);
  }

  const rangeChange = sampleChangeForDays(row, days);
  if (rangeChange !== null) {
    const startCorrection = row.current_price / (1 + rangeChange / 100) / prices[0];
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      prices[i] *= startCorrection + (1 - startCorrection) * progress;
    }
  }

  return prices
    .map((price, i) => [end - (count - 1 - i) * stepMs, price])
    .filter(([timestamp]) => timestamp >= listedAt);
}

function sampleChangeForDays(row, days) {
  if (days === 1) return row.price_change_percentage_24h;
  const key = { 7: '7d', 30: '30d', 365: '1y' }[days];
  return MOCK_DETAIL_EXTRAS[row.id]?.changes?.[key] ?? null;
}

function seededRandom(seedText) {
  let seed = [...seedText].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 17);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
