import cors from '@fastify/cors';
import Fastify from 'fastify';

import type { MarketDataSource } from './application/secondary-market/ports/market-data-source.js';
import type { ScpiYieldData } from './application/secondary-market/ports/scpi-yield-data.js';
import { marketRoutes } from './infra/http/routes/market-routes.js';
import { makeGetConfrontationEstimate } from './main/factories/make-get-confrontation-estimate.js';
import { makeGetScpiMarket } from './main/factories/make-get-scpi-market.js';
import { makeGetScpiYield } from './main/factories/make-get-scpi-yield.js';
import { makeSimulateScpiYield } from './main/factories/make-simulate-scpi-yield.js';

export interface AppOptions {
  allowedOrigin?: string;
  marketDataSources?: ReadonlyMap<string, MarketDataSource>;
  logger?: boolean;
  yieldData?: ScpiYieldData;
  /** Reference clock for the previous civil year used by the yield calculation. */
  now?: () => Date;
}

export function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  if (options.allowedOrigin) {
    app.register(cors, {
      origin: options.allowedOrigin,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    });
  }
  app.get('/api/health', async () => ({ status: 'ok', service: 'louveinvest-api' }));
  const getScpiMarket = makeGetScpiMarket(options.marketDataSources);
  const getScpiYield = makeGetScpiYield(getScpiMarket, options.yieldData, options.now);
  app.register(marketRoutes, {
    simulateScpiYield: makeSimulateScpiYield(getScpiYield),
    getScpiMarket,
    getConfrontationEstimate: makeGetConfrontationEstimate(getScpiMarket),
    getScpiYield,
  });
  return app;
}
