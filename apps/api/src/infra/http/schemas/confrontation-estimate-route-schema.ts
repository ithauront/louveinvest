import { marketRouteSchema } from './market-route-schema.js';

const market = marketRouteSchema.response[200].properties;
const count = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
const positiveCount = { ...count, minimum: 1 } as const;
const estimateFields = [
  'status',
  'executionPriceCents',
  'exchangedShares',
  'eligibleDemandShares',
  'eligibleSupplyShares',
  'unmatchedEligibleShares',
  'priceInterval',
];

export const confrontationEstimateRouteSchema = {
  params: marketRouteSchema.params,
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: [
        'scpi',
        'source',
        'freshness',
        'warnings',
        'nextConfrontation',
        'referencePriceCents',
        'coverage',
        'estimate',
        'assumptions',
        'limitations',
      ],
      properties: {
        scpi: market.scpi,
        source: market.source,
        freshness: market.freshness,
        warnings: market.warnings,
        nextConfrontation: market.nextConfrontation,
        referencePriceCents: positiveCount,
        coverage: market.orderBook.properties.coverage,
        assumptions: { type: 'array', items: { type: 'string' } },
        limitations: { type: 'array', items: { type: 'string' } },
        estimate: {
          anyOf: [
            {
              type: 'object',
              additionalProperties: false,
              required: estimateFields,
              properties: {
                status: { type: 'string', const: 'estimated' },
                executionPriceCents: positiveCount,
                exchangedShares: positiveCount,
                eligibleDemandShares: positiveCount,
                eligibleSupplyShares: positiveCount,
                unmatchedEligibleShares: count,
                priceInterval: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['minCents', 'maxCents'],
                  properties: { minCents: positiveCount, maxCents: positiveCount },
                },
              },
            },
            {
              type: 'object',
              additionalProperties: false,
              required: estimateFields,
              properties: {
                status: { type: 'string', enum: ['empty-book', 'no-crossing'] },
                executionPriceCents: { type: 'null' },
                exchangedShares: { type: 'integer', const: 0 },
                eligibleDemandShares: { type: 'null' },
                eligibleSupplyShares: { type: 'null' },
                unmatchedEligibleShares: { type: 'null' },
                priceInterval: { type: 'null' },
              },
            },
          ],
        },
      },
    },
    400: marketRouteSchema.response[400],
    404: marketRouteSchema.response[404],
    500: marketRouteSchema.response[500],
    502: marketRouteSchema.response[502],
    504: marketRouteSchema.response[504],
  },
} as const;
