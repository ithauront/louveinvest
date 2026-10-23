import { ApiClientError, getApiJson } from '../api-client';
import { parseScpiConfrontation } from './confrontation.validation';

export function getScpiConfrontation(scpiId: string, signal?: AbortSignal) {
  return getApiJson(
    `/api/scpis/${encodeURIComponent(scpiId)}/confrontation-estimate`,
    (value) => {
      const result = parseScpiConfrontation(value);
      if (result.scpi.id !== scpiId) throw new ApiClientError('INVALID_RESPONSE');
      return result;
    },
    signal,
  );
}
