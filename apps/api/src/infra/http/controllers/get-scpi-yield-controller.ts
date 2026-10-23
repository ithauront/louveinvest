import type { FastifyReply, FastifyRequest } from 'fastify';

import type { GetScpiYield } from '../../../application/secondary-market/use-cases/get-scpi-yield.js';
import type { GetScpiMarketParams } from './get-scpi-market-controller.js';

export class GetScpiYieldController {
  constructor(private readonly getScpiYield: GetScpiYield) {}

  async handle(request: FastifyRequest<{ Params: GetScpiMarketParams }>, reply: FastifyReply) {
    return reply.code(200).send(await this.getScpiYield.execute({ scpiId: request.params.scpiId }));
  }
}
