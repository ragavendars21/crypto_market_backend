import { Router } from 'express';

const startedAt = Date.now();

export function createHealthRouter({ config, version }) {
  const router = Router();

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
