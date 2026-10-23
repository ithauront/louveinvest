import { getScpiMarket } from '../../../services/market/get-scpi-market';
import { useScpiQuery } from './useScpiQuery';

export function useScpiMarket(scpiId: string) {
  return useScpiQuery(scpiId, getScpiMarket);
}
