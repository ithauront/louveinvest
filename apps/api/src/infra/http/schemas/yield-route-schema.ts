import { marketRouteSchema } from './market-route-schema.js';

const market = marketRouteSchema.response[200].properties;
const provenance = {
  type: 'object',
  additionalProperties: false,
  required: ['url', 'pages'],
  properties: {
    url: { type: 'string' },
    pages: { type: 'array', items: { type: 'integer', minimum: 1 } },
  },
} as const;

export const yieldRouteSchema = {
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
        'execution',
        'dividend',
        'fees',
        'acquisitionCostPerShareCents',
        'annualYieldPercent',
      ],
      properties: {
        scpi: market.scpi,
        source: market.source,
        freshness: market.freshness,
        warnings: market.warnings,
        execution: market.lastExecution,
        acquisitionCostPerShareCents: { type: 'integer', minimum: 1 },
        annualYieldPercent: { type: 'number', minimum: 0 },
        dividend: {
          type: 'object',
          additionalProperties: false,
          required: ['year', 'grossPerShareCents', 'source'],
          properties: {
            year: { type: 'integer' },
            grossPerShareCents: { type: 'integer', minimum: 0 },
            source: provenance,
          },
        },
        fees: {
          type: 'object',
          additionalProperties: false,
          required: [
            'commissionBasisPoints',
            'registrationBasisPoints',
            'fixedFeesIncluded',
            'source',
          ],
          properties: {
            commissionBasisPoints: { type: 'integer', minimum: 0, maximum: 10_000 },
            registrationBasisPoints: { type: 'integer', minimum: 0, maximum: 10_000 },
            fixedFeesIncluded: { type: 'boolean', const: false },
            source: provenance,
          },
        },
      },
    },
    400: marketRouteSchema.response[400],
    404: marketRouteSchema.response[404],
    500: marketRouteSchema.response[500],
    502: marketRouteSchema.response[502],
    503: marketRouteSchema.response[502],
    504: marketRouteSchema.response[504],
  },
} as const;
