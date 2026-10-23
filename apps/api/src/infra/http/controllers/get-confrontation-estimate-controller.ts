import type { FastifyReply, FastifyRequest } from 'fastify';

import type { GetConfrontationEstimate } from '../../../application/secondary-market/use-cases/get-confrontation-estimate.js';
import type { GetScpiMarketParams } from './get-scpi-market-controller.js';

export class GetConfrontationEstimateController {
  constructor(private readonly getEstimate: GetConfrontationEstimate) {}

  async handle(request: FastifyRequest<{ Params: GetScpiMarketParams }>, reply: FastifyReply) {
    return reply.code(200).send(await this.getEstimate.execute({ scpiId: request.params.scpiId }));
  }
}
