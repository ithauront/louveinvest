import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { MarketSourceError } from '../../../application/secondary-market/errors/market-source-error.js';
import { YieldDataUnavailableError } from '../../../application/secondary-market/errors/yield-data-unavailable-error.js';
import { ScpiNotFoundError } from '../../../application/secondary-market/use-cases/get-scpi-market.js';
import { InvalidYieldInputError } from '../../../domain/secondary-market/errors/invalid-yield-input-error.js';

const sourceErrors = {
  SOURCE_TIMEOUT: { status: 504, message: 'Market data source timed out.' },
  SOURCE_UNAVAILABLE: { status: 502, message: 'Market data source is unavailable.' },
  SOURCE_FORMAT_CHANGED: {
    status: 502,
    message: 'Market data source returned an unexpected format.',
  },
} as const;

export function marketErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (
    error.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
    error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY'
  ) {
    return reply
      .code(400)
      .send({ error: { code: 'INVALID_REQUEST', message: 'Invalid JSON body.' } });
  }
  if (error.validation) {
    return reply.code(400).send({
      error: {
        code: 'INVALID_REQUEST',
        message:
          error.validationContext === 'params'
            ? 'Invalid SCPI identifier.'
            : 'Invalid request body.',
      },
    });
  }
  if (error instanceof InvalidYieldInputError) {
    return reply
      .code(400)
      .send({ error: { code: error.code, message: `Invalid yield input: ${error.field}` } });
  }
  if (error instanceof ScpiNotFoundError) {
    return reply
      .code(404)
      .send({ error: { code: 'SCPI_NOT_FOUND', message: 'SCPI is not registered.' } });
  }
  if (error instanceof YieldDataUnavailableError) {
    request.log.warn({ err: error }, 'Annual yield parameters unavailable');
    return reply.code(503).send({
      error: {
        code: error.code,
        message: 'Yield parameters for the previous civil year are unavailable.',
      },
    });
  }
  if (error instanceof MarketSourceError) {
    const mapped = sourceErrors[error.code];
    request.log.warn({ err: error }, 'Market source request failed');
    return reply.code(mapped.status).send({ error: { code: error.code, message: mapped.message } });
  }
  request.log.error({ err: error }, 'Unexpected market request failure');
  return reply
    .code(500)
    .send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
}
