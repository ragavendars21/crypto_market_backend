import { z } from 'zod';

import { CHART_RANGE_KEYS } from '../config/marketData.js';
import { SORT_OPTIONS } from '../services/marketQuery.js';

const COIN_ID_PATTERN = /^[a-z0-9-]{1,100}$/;
const MAX_IDS = 50;

export const coinIdParamsSchema = z.object({
  coinId: z.string().regex(COIN_ID_PATTERN, 'Must be a coin ID such as "bitcoin"'),
});

const idsSchema = z
  .string()
  .transform((value) => value.split(',').map((id) => id.trim()).filter(Boolean))
  .pipe(
    z
      .array(z.string().regex(COIN_ID_PATTERN, 'Each ID must look like "bitcoin"'))
      .min(1, 'Provide at least one ID')
      .max(MAX_IDS, `At most ${MAX_IDS} IDs are allowed`),
  );

/**
 * `GET /coins` query. `strictObject` rejects unknown parameters, so a typo
 * like `?srot=price_desc` fails loudly instead of being silently ignored.
 * Fields are optional first so we can tell "not sent" from "default" when
 * checking that `ids` isn't combined with listing filters; defaults are
 * applied afterwards.
 */
export const listCoinsQuerySchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(50).optional(),
    sort: z.enum(SORT_OPTIONS).optional(),
    movement: z.enum(['all', 'gainers', 'losers']).optional(),
    tier: z.enum(['all', 'large', 'mid', 'small']).optional(),
    ids: idsSchema.optional(),
  })
  .superRefine((query, ctx) => {
    if (!query.ids) return;
    for (const field of ['search', 'movement', 'tier', 'page']) {
      if (query[field] !== undefined) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'Cannot be combined with ids' });
      }
    }
  })
  .transform((query) => ({
    page: 1,
    perPage: 25,
    sort: 'market_cap_desc',
    movement: 'all',
    tier: 'all',
    ...query,
  }));

export const marketChartQuerySchema = z.strictObject({
  range: z.enum(CHART_RANGE_KEYS),
});

export const emptyQuerySchema = z.strictObject({});
