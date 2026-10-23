import { ApiClientError, getApiJson } from '../api-client';
import { parseScpiMarket } from './market.validation';

export function getScpiMarket(scpiId: string, signal?: AbortSignal) {
  return getApiJson(
    `/api/scpis/${encodeURIComponent(scpiId)}/market`,
    (value) => {
      const market = parseScpiMarket(value);
      if (market.scpi.id !== scpiId) throw new ApiClientError('INVALID_RESPONSE');
      return market;
    },
    signal,
  );
}
