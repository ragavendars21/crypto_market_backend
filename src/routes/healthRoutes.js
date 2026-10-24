import { Router } from 'express';

const startedAt = Date.now();

export function createHealthRouter({ config, version }) {
  const router = Router();

  // Never calls CoinGecko: it reports whether *this* server is up.
  router.get('/', (req, res) => {
    res.json({
      data: {
        status: 'ok',
        dataSource: config.dataSource,
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        version,
      },
    });
  });

  return router;
}
