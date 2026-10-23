import { MAXIMUM_YIELD_CURVE_POINTS } from '../../../domain/secondary-market/services/calculate-yield-curve.js';
import { yieldRouteSchema } from './yield-route-schema.js';

const positiveInteger = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } as const;
const nonnegativeInteger = { ...positiveInteger, minimum: 0 } as const;
const simulation = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sellerPriceCents',
    'shares',
    'fixedFeesCents',
    'totalAcquisitionCostCents',
    'acquisitionCostPerShareCents',
    'annualGrossDividendCents',
    'annualYieldPercent',
  ],
  properties: {
    sellerPriceCents: positiveInteger,
    shares: positiveInteger,
    fixedFeesCents: nonnegativeInteger,
    totalAcquisitionCostCents: positiveInteger,
    acquisitionCostPerShareCents: positiveInteger,
    annualGrossDividendCents: nonnegativeInteger,
    annualYieldPercent: { type: 'number', minimum: 0 },
  },
} as const;
const common = {
  reference: yieldRouteSchema.response[200],
  fixedFeesBasis: { type: 'string', const: 'user-assumption' },
} as const;
const purchaseProperties = {
  sellerPriceCents: positiveInteger,
  shares: positiveInteger,
  fixedFeesCents: nonnegativeInteger,
};
const curveProperties = {
  minimumPriceCents: positiveInteger,
  maximumPriceCents: positiveInteger,
  priceStepCents: positiveInteger,
  shares: positiveInteger,
  fixedFeesCents: nonnegativeInteger,
};
export const yieldSimulationRouteSchema = {
  params: yieldRouteSchema.params,
  body: {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(purchaseProperties),
    properties: purchaseProperties,
  },
  response: {
    ...yieldRouteSchema.response,
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['reference', 'fixedFeesBasis', 'simulation'],
      properties: { ...common, simulation },
    },
  },
} as const;
export const yieldCurveRouteSchema = {
  params: yieldRouteSchema.params,
  body: {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(curveProperties),
    properties: curveProperties,
  },
  response: {
    ...yieldRouteSchema.response,
    200: {
      type: 'object',
      additionalProperties: false,
      required: ['reference', 'fixedFeesBasis', 'points'],
      properties: {
        ...common,
        points: {
          type: 'array',
          minItems: 1,
          maxItems: MAXIMUM_YIELD_CURVE_POINTS,
          items: simulation,
        },
      },
    },
  },
} as const;
