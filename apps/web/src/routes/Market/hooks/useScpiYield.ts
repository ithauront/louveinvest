import { getScpiYield } from '../../../services/market/get-scpi-yield';
import { useScpiQuery } from './useScpiQuery';

export function useScpiYield(scpiId: string) {
  return useScpiQuery(scpiId, getScpiYield);
}
