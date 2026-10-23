import type { FastifyInstance } from 'fastify';

import type { GetConfrontationEstimate } from '../../../application/secondary-market/use-cases/get-confrontation-estimate.js';
import type { GetScpiMarket } from '../../../application/secondary-market/use-cases/get-scpi-market.js';
import type { GetScpiYield } from '../../../application/secondary-market/use-cases/get-scpi-yield.js';
import type { SimulateScpiYield } from '../../../application/secondary-market/use-cases/simulate-scpi-yield.js';
import type { YieldCurveInput } from '../../../domain/secondary-market/services/calculate-yield-curve.js';
import type { YieldSimulationInput } from '../../../domain/secondary-market/value-objects/yield-simulation.js';
import { GetConfrontationEstimateController } from '../controllers/get-confrontation-estimate-controller.js';
import {
  GetScpiMarketController,
  type GetScpiMarketParams,
} from '../controllers/get-scpi-market-controller.js';
import { GetScpiYieldController } from '../controllers/get-scpi-yield-controller.js';
import { SimulateScpiYieldController } from '../controllers/simulate-scpi-yield-controller.js';
import { marketErrorHandler } from '../errors/market-error-handler.js';
import { confrontationEstimateRouteSchema } from '../schemas/confrontation-estimate-route-schema.js';
import { marketRouteSchema } from '../schemas/market-route-schema.js';
import { yieldRouteSchema } from '../schemas/yield-route-schema.js';
import {
  yieldCurveRouteSchema,
  yieldSimulationRouteSchema,
} from '../schemas/yield-simulation-route-schema.js';

export async function marketRoutes(
  app: FastifyInstance,
  options: {
    simulateScpiYield: SimulateScpiYield;
    getScpiMarket: GetScpiMarket;
    getScpiYield: GetScpiYield;
    getConfrontationEstimate: GetConfrontationEstimate;
  },
) {
  const controller = new GetScpiMarketController(options.getScpiMarket);
  const yieldController = new GetScpiYieldController(options.getScpiYield);
  const estimateController = new GetConfrontationEstimateController(
    options.getConfrontationEstimate,
  );
  app.setErrorHandler(marketErrorHandler);
  const simulationController = new SimulateScpiYieldController(options.simulateScpiYield);
  app.post<{ Params: GetScpiMarketParams; Body: YieldSimulationInput }>(
    '/api/scpis/:scpiId/yield-simulation',
    { schema: yieldSimulationRouteSchema },
    (request, reply) => simulationController.handle(request, reply),
  );
  app.post<{ Params: GetScpiMarketParams; Body: YieldCurveInput }>(
    '/api/scpis/:scpiId/yield-curve',
    { schema: yieldCurveRouteSchema },
    (request, reply) => simulationController.handleCurve(request, reply),
  );

  app.get<{ Params: GetScpiMarketParams }>(
    '/api/scpis/:scpiId/market',
    {
      schema: marketRouteSchema,
    },
    (request, reply) => controller.handle(request, reply),
  );

  app.get<{ Params: GetScpiMarketParams }>(
    '/api/scpis/:scpiId/yield',
    {
      schema: yieldRouteSchema,
    },
    (request, reply) => yieldController.handle(request, reply),
  );
  app.get<{ Params: GetScpiMarketParams }>(
    '/api/scpis/:scpiId/confrontation-estimate',
    { schema: confrontationEstimateRouteSchema },
    (request, reply) => estimateController.handle(request, reply),
  );
}
