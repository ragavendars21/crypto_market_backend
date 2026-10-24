import { Router } from 'express';

import { validate } from '../middleware/validate.js';
import {
  coinIdParamsSchema,
  emptyQuerySchema,
  listCoinsQuerySchema,
  marketChartQuerySchema,
} from '../schemas/coinSchemas.js';

/** Paths, HTTP methods and validation for the market data endpoints. */
export function createMarketRouter({ coinController }) {
  const router = Router();

  router.get('/coins', validate({ query: listCoinsQuerySchema }), coinController.listCoins);

  router.get(
    '/coins/:coinId',
    validate({ params: coinIdParamsSchema, query: emptyQuerySchema }),
    coinController.getCoinDetails,
  );

  router.get(
    '/coins/:coinId/market-chart',
    validate({ params: coinIdParamsSchema, query: marketChartQuerySchema }),
    coinController.getMarketChart,
  );

  router.get('/market/global', validate({ query: emptyQuerySchema }), coinController.getGlobalStats);

  return router;
}
