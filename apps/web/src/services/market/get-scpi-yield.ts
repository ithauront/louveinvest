import { ApiClientError, getApiJson } from '../api-client';
import { parseScpiYield } from './yield.validation';

export function getScpiYield(scpiId: string, signal?: AbortSignal) {
  return getApiJson(
    `/api/scpis/${encodeURIComponent(scpiId)}/yield`,
    (value) => {
      const result = parseScpiYield(value);
      if (result.scpi.id !== scpiId) throw new ApiClientError('INVALID_RESPONSE');
      return result;
    },
    signal,
  );
}
