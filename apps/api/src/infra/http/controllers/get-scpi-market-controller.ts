import type { FastifyReply, FastifyRequest } from 'fastify';

import type { GetScpiMarket } from '../../../application/secondary-market/use-cases/get-scpi-market.js';

export interface GetScpiMarketParams {
  scpiId: string;
}

export class GetScpiMarketController {
  constructor(private readonly getScpiMarket: GetScpiMarket) {}

  async handle(request: FastifyRequest<{ Params: GetScpiMarketParams }>, reply: FastifyReply) {
    const snapshot = await this.getScpiMarket.execute({ scpiId: request.params.scpiId });
    return reply.code(200).send(snapshot);
  }
}
