import { useEffect, useState } from 'react';

import { ApiClientError } from '../../../services/api-client';

export type ScpiQueryState<T> =
  { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; code: string };

export function useScpiQuery<T>(
  scpiId: string,
  load: (id: string, signal: AbortSignal) => Promise<T>,
) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    scpiId: string;
    request: number;
    state: ScpiQueryState<T>;
  }>({
    scpiId,
    request,
    state: { status: 'loading' },
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ scpiId, request, state: { status: 'loading' } });
    load(scpiId, controller.signal).then(
      (data) => {
        if (active) setResult({ scpiId, request, state: { status: 'success', data } });
      },
      (error) => {
        if (active)
          setResult({
            scpiId,
            request,
            state: {
              status: 'error',
              code: error instanceof ApiClientError ? error.code : 'NETWORK_ERROR',
            },
          });
      },
    );
    // Ignore late completions even when a transport does not honor cancellation.
    return () => {
      active = false;
      controller.abort();
    };
  }, [scpiId, request, load]);
  const state: ScpiQueryState<T> =
    result.scpiId === scpiId && result.request === request ? result.state : { status: 'loading' };
  return { state, reload: () => setRequest((current) => current + 1) };
}
