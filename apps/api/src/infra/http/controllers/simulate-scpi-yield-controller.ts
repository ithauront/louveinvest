import type { FastifyReply, FastifyRequest } from 'fastify';

import type { SimulateScpiYield } from '../../../application/secondary-market/use-cases/simulate-scpi-yield.js';
import type { YieldCurveInput } from '../../../domain/secondary-market/services/calculate-yield-curve.js';
import type { YieldSimulationInput } from '../../../domain/secondary-market/value-objects/yield-simulation.js';
import type { GetScpiMarketParams } from './get-scpi-market-controller.js';

export class SimulateScpiYieldController {
  constructor(private readonly simulate: SimulateScpiYield) {}

  async handle(
    request: FastifyRequest<{ Params: GetScpiMarketParams; Body: YieldSimulationInput }>,
    reply: FastifyReply,
  ) {
    return reply.send(
      await this.simulate.execute({ ...request.body, scpiId: request.params.scpiId }),
    );
  }

  async handleCurve(
    request: FastifyRequest<{ Params: GetScpiMarketParams; Body: YieldCurveInput }>,
    reply: FastifyReply,
  ) {
    return reply.send(
      await this.simulate.executeCurve({ ...request.body, scpiId: request.params.scpiId }),
    );
  }
}
