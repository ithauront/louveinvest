import { getScpiConfrontation } from '../../../services/market/get-scpi-confrontation';
import { useScpiQuery } from './useScpiQuery';

export function useScpiConfrontation(scpiId: string) {
  return useScpiQuery(scpiId, getScpiConfrontation);
}
