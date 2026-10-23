import { GetConfrontationEstimate } from '../../application/secondary-market/use-cases/get-confrontation-estimate.js';
import type { GetScpiMarket } from '../../application/secondary-market/use-cases/get-scpi-market.js';

export function makeGetConfrontationEstimate(getMarket: GetScpiMarket): GetConfrontationEstimate {
  return new GetConfrontationEstimate(getMarket);
}
