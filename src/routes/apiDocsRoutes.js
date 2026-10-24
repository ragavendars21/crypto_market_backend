import { readFileSync } from 'node:fs';

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

const openApiDocument = parse(readFileSync(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8'));

/** Interactive API documentation at /api-docs and the raw spec at /api-docs/openapi.json. */
export function createApiDocsRouter() {
  const router = Router();
  router.get('/openapi.json', (req, res) => res.json(openApiDocument));
  router.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  return router;
}
