const positiveInteger = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } as const;
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } as const;
const localDateTime = {
  type: 'string',
  pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$',
} as const;
const execution = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'shares', 'sellerPriceCents', 'buyerPriceCents'],
  properties: {
    date,
    shares: { type: 'integer', minimum: 0 },
    sellerPriceCents: positiveInteger,
    buyerPriceCents: positiveInteger,
  },
} as const;
const levelProperties = {
  orderCount: positiveInteger,
  shares: positiveInteger,
  sellerLimitCents: positiveInteger,
} as const;
const localDateTimeObject = {
  type: 'object',
  additionalProperties: false,
  required: ['localDateTime'],
  properties: { localDateTime },
} as const;
const errorResponse = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  },
} as const;

export const marketRouteSchema = {
  params: {
    type: 'object',
    additionalProperties: false,
    required: ['scpiId'],
    properties: {
      scpiId: { type: 'string', maxLength: 64, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
    },
  },
  response: {
    200: {
      type: 'object',
      additionalProperties: false,
      required: [
        'scpi',
        'source',
        'lastExecution',
        'nextConfrontation',
        'orderDeadline',
        'history',
        'orderBook',
        'freshness',
        'warnings',
      ],
      properties: {
        freshness: { type: 'string', enum: ['fresh', 'stale'] },
        warnings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', const: 'STALE_DATA' },
              message: { type: 'string' },
            },
          },
        },
        scpi: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'manager'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            manager: { type: 'string' },
          },
        },
        source: {
          type: 'object',
          additionalProperties: false,
          required: ['url', 'fetchedAt', 'updatedAtLocal', 'timeZone'],
          properties: {
            url: { type: 'string' },
            fetchedAt: { type: 'string' },
            updatedAtLocal: localDateTime,
            timeZone: { type: 'string', const: 'Europe/Paris' },
          },
        },
        lastExecution: execution,
        nextConfrontation: localDateTimeObject,
        orderDeadline: localDateTimeObject,
        history: { type: 'array', items: execution },
        orderBook: {
          type: 'object',
          additionalProperties: false,
          required: ['coverage', 'bids', 'asks'],
          properties: {
            coverage: { type: 'string', const: 'public-top-5-levels' },
            bids: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['orderCount', 'shares', 'sellerLimitCents', 'buyerLimitCents'],
                properties: { ...levelProperties, buyerLimitCents: positiveInteger },
              },
            },
            asks: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['orderCount', 'shares', 'sellerLimitCents'],
                properties: levelProperties,
              },
            },
          },
        },
      },
    },
    400: errorResponse,
    404: errorResponse,
    500: errorResponse,
    502: errorResponse,
    504: errorResponse,
  },
} as const;
