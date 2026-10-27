import { CHART_RANGES } from '../config/marketData.js';
import { malformedUpstreamResponse } from '../utils/upstreamErrors.js';

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const toInteger = (value) => (Number.isInteger(value) ? value : null);

const toText = (value) => (typeof value === 'string' && value.trim() !== '' ? value : null);

const toIsoDate = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const hasIdentity = (raw) => isPlainObject(raw) && toText(raw.id) && toText(raw.symbol) && toText(raw.name);

export function toCoinSummaries(rawList) {
  if (!Array.isArray(rawList)) throw malformedUpstreamResponse();
  return rawList.filter(hasIdentity).map(toCoinSummary);
}

function toCoinSummary(raw) {
  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    imageUrl: toText(raw.image),
    marketCapRank: toInteger(raw.market_cap_rank),
    priceUsd: toNumber(raw.current_price),
    priceChange24hUsd: toNumber(raw.price_change_24h),
    priceChangePercentage24h: toNumber(raw.price_change_percentage_24h),
    marketCapUsd: toNumber(raw.market_cap),
    totalVolumeUsd: toNumber(raw.total_volume),
    circulatingSupply: toNumber(raw.circulating_supply),
    lastUpdated: toIsoDate(raw.last_updated),
  };
}

export function toCoinDetails(raw) {
  if (!hasIdentity(raw)) throw malformedUpstreamResponse();

  const market = isPlainObject(raw.market_data) ? raw.market_data : {};
  const usd = (field) => (isPlainObject(market[field]) ? toNumber(market[field].usd) : null);
  const image = isPlainObject(raw.image) ? raw.image : {};

  return {
    id: raw.id,
    symbol: raw.symbol,
    name: raw.name,
    imageUrl: toText(image.large) ?? toText(image.small),
    marketCapRank: toInteger(raw.market_cap_rank),
    priceUsd: usd('current_price'),
    marketCapUsd: usd('market_cap'),
    fullyDilutedValuationUsd: usd('fully_diluted_valuation'),
    totalVolumeUsd: usd('total_volume'),
    high24hUsd: usd('high_24h'),
    low24hUsd: usd('low_24h'),
    circulatingSupply: toNumber(market.circulating_supply),
    totalSupply: toNumber(market.total_supply),
    maxSupply: toNumber(market.max_supply),
    priceChangePercentages: {
      '1h': usd('price_change_percentage_1h_in_currency'),
      '24h': toNumber(market.price_change_percentage_24h),
      '7d': toNumber(market.price_change_percentage_7d),
      '14d': toNumber(market.price_change_percentage_14d),
      '30d': toNumber(market.price_change_percentage_30d),
      '60d': toNumber(market.price_change_percentage_60d),
      '200d': toNumber(market.price_change_percentage_200d),
      '1y': toNumber(market.price_change_percentage_1y),
    },
    allTimeHigh: toPriceExtreme(usd('ath'), usd('ath_change_percentage'), market.ath_date),
    allTimeLow: toPriceExtreme(usd('atl'), usd('atl_change_percentage'), market.atl_date),
    lastUpdated: toIsoDate(market.last_updated ?? raw.last_updated),
  };
}

function toPriceExtreme(priceUsd, changePercentage, rawDates) {
  if (priceUsd === null) return null;
  const date = isPlainObject(rawDates) ? toIsoDate(rawDates.usd) : null;
  return { priceUsd, changePercentage, date };
}

export function toPriceHistory(raw, coinId, range) {
  if (!isPlainObject(raw) || !Array.isArray(raw.prices)) throw malformedUpstreamResponse();

  const points = raw.prices
    .filter((pair) => Array.isArray(pair) && toNumber(pair[0]) !== null && toNumber(pair[1]) !== null)
    .map(([timestamp, priceUsd]) => ({ timestamp: Math.trunc(timestamp), priceUsd }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return { coinId, range, granularity: CHART_RANGES[range].granularity, points };
}

export function toGlobalStats(raw) {
  if (!isPlainObject(raw) || !isPlainObject(raw.data)) throw malformedUpstreamResponse();
  const data = raw.data;
  const usd = (field) => (isPlainObject(data[field]) ? toNumber(data[field].usd) : null);

  const percentages = isPlainObject(data.market_cap_percentage) ? data.market_cap_percentage : {};
  const dominance = Object.entries(percentages)
    .filter(([, percentage]) => toNumber(percentage) !== null)
    .map(([symbol, percentage]) => ({ symbol, percentage }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    totalMarketCapUsd: usd('total_market_cap'),
    totalVolumeUsd: usd('total_volume'),
    marketCapChangePercentage24h: toNumber(data.market_cap_change_percentage_24h_usd),
    volumeChangePercentage24h: toNumber(data.volume_change_percentage_24h_usd),
    activeCryptocurrencies: toInteger(data.active_cryptocurrencies),
    markets: toInteger(data.markets),
    dominance,
    updatedAt: toNumber(data.updated_at) === null ? null : toIsoDate(data.updated_at * 1000),
  };
}
