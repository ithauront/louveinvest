import { useEffect, useRef, useState } from 'react';

import { ApiClientError } from '../../../services/api-client';

type ScenarioState<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; code: string };
export function useYieldScenario<Input, Result>(
  scpiId: string,
  request: (id: string, input: Input, signal: AbortSignal) => Promise<Result>,
) {
  const [result, setResult] = useState<{ scpiId: string; state: ScenarioState<Result> }>({
    scpiId,
    state: { status: 'idle' },
  });
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      controller.current?.abort();
    },
    [scpiId],
  );
  function reset() {
    generation.current++;
    controller.current?.abort();
    setResult({ scpiId, state: { status: 'idle' } });
  }
  async function run(input: Input) {
    const sequence = ++generation.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setResult({ scpiId, state: { status: 'loading' } });
    try {
      const data = await request(scpiId, input, current.signal);
      if (sequence === generation.current)
        setResult({ scpiId, state: { status: 'success', data } });
    } catch (error) {
      if (sequence === generation.current)
        setResult({
          scpiId,
          state: {
            status: 'error',
            code: error instanceof ApiClientError ? error.code : 'NETWORK_ERROR',
          },
        });
    }
  }
  const state: ScenarioState<Result> = result.scpiId === scpiId ? result.state : { status: 'idle' };
  return { state, run, reset };
}
