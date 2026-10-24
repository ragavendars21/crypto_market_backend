import { sendData } from '../utils/response.js';

/**
 * Controllers translate HTTP into service calls and back. They read the
 * already-validated input, call the service and send the envelope. No
 * business logic lives here.
 */
export function createCoinController({ marketService, dataSource }) {
  return {
    async listCoins(req, res) {
      const query = req.validated.query;

      if (query.ids) {
        const result = await marketService.getCoinsByIds(query.ids, query.sort);
        return sendData(res, { data: result.value, ...result, dataSource });
      }

      const result = await marketService.listCoins(query);
      sendData(res, { data: result.value, ...result, dataSource, extraMeta: result.pagination });
    },

    async getCoinDetails(req, res) {
      const result = await marketService.getCoinDetails(req.validated.params.coinId);
      sendData(res, { data: result.value, ...result, dataSource });
    },

    async getMarketChart(req, res) {
      const { coinId } = req.validated.params;
      const result = await marketService.getMarketChart(coinId, req.validated.query.range);
      sendData(res, { data: result.value, ...result, dataSource });
    },

    async getGlobalStats(req, res) {
      const result = await marketService.getGlobalStats();
      sendData(res, { data: result.value, ...result, dataSource });
    },
  };
}
