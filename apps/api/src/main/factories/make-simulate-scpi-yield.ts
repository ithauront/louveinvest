import type { GetScpiYield } from '../../application/secondary-market/use-cases/get-scpi-yield.js';
import { SimulateScpiYield } from '../../application/secondary-market/use-cases/simulate-scpi-yield.js';

export function makeSimulateScpiYield(getYield: GetScpiYield) {
  return new SimulateScpiYield(getYield);
}
