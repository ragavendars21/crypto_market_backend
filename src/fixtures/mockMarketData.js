export const MOCK_LAST_UPDATED = '2026-10-23T10:00:00.000Z';

const IMAGE_BASE = 'https://coin-images.coingecko.com/coins/images';

function market(id, symbol, name, imagePath, rank, price, change24h, marketCap, volume, circulating) {
  const priceChange24h = price === null || change24h === null ? null : price - price / (1 + change24h / 100);
  return {
    id,
    symbol,
    name,
    image: imagePath ? `${IMAGE_BASE}/${imagePath}` : null,
    current_price: price,
    market_cap: marketCap,
    market_cap_rank: rank,
    total_volume: volume,
    high_24h: price === null ? null : price * 1.021,
    low_24h: price === null ? null : price * 0.978,
    price_change_24h: priceChange24h,
    price_change_percentage_24h: change24h,
    circulating_supply: circulating,
    last_updated: MOCK_LAST_UPDATED,
  };
}

export const MOCK_MARKETS = [
  market('bitcoin', 'btc', 'Bitcoin', '1/large/bitcoin.png', 1, 67012.5, 1.85, 1.321e12, 3.12e10, 19712345),
  market('ethereum', 'eth', 'Ethereum', '279/large/ethereum.png', 2, 3285.4, -0.92, 3.95e11, 1.48e10, 120280000),
  market('tether', 'usdt', 'Tether', '325/large/Tether.png', 3, 1.0002, 0.01, 1.18e11, 4.9e10, 118000000000),
  market('binancecoin', 'bnb', 'BNB', '825/large/bnb-icon2_2x.png', 4, 598.2, 0.64, 8.72e10, 1.6e9, 145800000),
  market('solana', 'sol', 'Solana', '4128/large/solana.png', 5, 172.41, 5.58, 8.12e10, 4.12e9, 471234567),
  market('usd-coin', 'usdc', 'USDC', '6319/large/usdc.png', 6, 0.9998, -0.01, 3.42e10, 6.1e9, 34200000000),
  market('ripple', 'xrp', 'XRP', '44/large/xrp-symbol-white-128.png', 7, 0.5234, -2.31, 2.95e10, 1.2e9, 56400000000),
  market('dogecoin', 'doge', 'Dogecoin', '5/large/dogecoin.png', 8, 0.1385, 7.42, 2.02e10, 1.9e9, 146000000000),
  market('tron', 'trx', 'TRON', '1094/large/tron-logo.png', 9, 0.1621, 0.35, 1.41e10, 4.1e8, 87000000000),
  market('cardano', 'ada', 'Cardano', '975/large/cardano.png', 10, 0.3612, -1.12, 1.28e10, 3.4e8, 35400000000),
  market('avalanche-2', 'avax', 'Avalanche', '12559/large/Avalanche_Circle_RedWhite_Trans.png', 11, 28.45, 3.2, 1.16e10, 4.5e8, 407000000),
  market('shiba-inu', 'shib', 'Shiba Inu', '11939/large/shiba.png', 12, 0.00001842, -3.75, 1.09e10, 3.8e8, 589000000000000),
  market('chainlink', 'link', 'Chainlink', '877/large/chainlink-new-logo.png', 13, 13.62, 2.05, 8.3e9, 3.6e8, 608000000),
  market('polkadot', 'dot', 'Polkadot', '12171/large/polkadot.png', 14, 5.42, -0.45, 7.9e9, 2.1e8, 1460000000),
  market('bitcoin-cash', 'bch', 'Bitcoin Cash', '780/large/bitcoin-cash-circle.png', 15, 372.1, 1.4, 7.35e9, 2.9e8, 19750000),
  market('near', 'near', 'NEAR Protocol', '10365/large/near.jpg', 16, 5.12, -4.8, 5.9e9, 3.1e8, 1150000000),
  market('litecoin', 'ltc', 'Litecoin', '2/large/litecoin.png', 17, 71.3, 0.9, 5.35e9, 3.3e8, 75000000),
  market('uniswap', 'uni', 'Uniswap', '12504/large/uni.jpg', 18, 7.85, 6.1, 4.7e9, 1.9e8, null),
  market('pepe', 'pepe', 'Pepe', '29850/large/pepe-token.jpeg', 19, 0.0000089, 12.4, 3.74e9, 9.8e8, 420690000000000),
  market('stellar', 'xlm', 'Stellar', '100/large/Stellar_symbol_black_RGB.png', 20, 0.0942, null, 2.73e9, 6.2e7, 29000000000),
  market('the-graph', 'grt', 'The Graph', '13397/large/Graph_Token.png', 21, 0.16, -2.1, 1.53e9, 5.1e7, 9550000000),
  market('decentraland', 'mana', 'Decentraland', '878/large/decentraland-mana.png', 22, 0.29, 1.15, 5.5e8, 3.2e7, 1900000000),
  market('basic-attention-token', 'bat', 'Basic Attention Token', '677/large/basic-attention-token.png', 23, 0.18, -0.6, 2.7e8, 1.4e7, 1490000000),
  market('sample-new-coin', 'snew', 'Sample New Coin With A Very Long Name', null, null, 0.042, null, null, 125000, null),
];

export const MOCK_DETAIL_EXTRAS = {
  bitcoin: {
    total_supply: 21000000,
    max_supply: 21000000,
    fully_diluted_valuation: 1.407e12,
    changes: { '1h': 0.12, '7d': -2.4, '14d': 3.1, '30d': 8.9, '60d': 12.3, '200d': 25.6, '1y': 98.7 },
    ath: { price: 73738, change: -9.12, date: '2024-03-14T07:10:36.635Z' },
    atl: { price: 67.81, change: 98724.1, date: '2013-07-06T00:00:00.000Z' },
  },
  ethereum: {
    total_supply: 120280000,
    max_supply: null,
    fully_diluted_valuation: 3.95e11,
    changes: { '1h': -0.08, '7d': -4.1, '14d': -1.2, '30d': 5.4, '60d': 9.8, '200d': -6.5, '1y': 41.2 },
    ath: { price: 4878.26, change: -32.65, date: '2021-11-10T14:24:19.604Z' },
    atl: { price: 0.432979, change: 758700.5, date: '2015-10-20T00:00:00.000Z' },
  },
  solana: {
    total_supply: 584000000,
    max_supply: null,
    fully_diluted_valuation: 1.007e11,
    changes: { '1h': 0.45, '7d': 11.2, '14d': 15.8, '30d': 22.4, '60d': 30.1, '200d': 48.9, '1y': 310.5 },
    ath: { price: 259.96, change: -33.68, date: '2021-11-06T21:54:35.825Z' },
    atl: { price: 0.500801, change: 34330.2, date: '2020-05-11T19:35:23.449Z' },
  },
};

export const MOCK_LISTING_AGE_MS = { 'sample-new-coin': 60 * 60 * 1000 };

export const MOCK_GLOBAL = {
  data: {
    active_cryptocurrencies: 17321,
    markets: 1287,
    total_market_cap: { usd: 2.41e12, btc: 36000000 },
    total_volume: { usd: 9.87e10, btc: 1470000 },
    market_cap_percentage: {
      btc: 54.8,
      eth: 16.4,
      usdt: 4.9,
      bnb: 3.6,
      sol: 3.4,
      usdc: 1.4,
      xrp: 1.2,
      doge: 0.8,
      trx: 0.6,
      ada: 0.5,
    },
    market_cap_change_percentage_24h_usd: 1.42,
    volume_change_percentage_24h_usd: -6.3,
    updated_at: Date.parse(MOCK_LAST_UPDATED) / 1000,
  },
};
