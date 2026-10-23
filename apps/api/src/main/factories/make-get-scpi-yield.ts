import type { ScpiYieldData } from '../../application/secondary-market/ports/scpi-yield-data.js';
import type { GetScpiMarket } from '../../application/secondary-market/use-cases/get-scpi-market.js';
import { GetScpiYield } from '../../application/secondary-market/use-cases/get-scpi-yield.js';
import { StaticScpiYieldData } from '../../infra/market-data/yield/static-scpi-yield-data.js';

export function makeGetScpiYield(
  getMarket: GetScpiMarket,
  data: ScpiYieldData = new StaticScpiYieldData(),
  now?: () => Date,
) {
  return new GetScpiYield(getMarket, data, now);
}
