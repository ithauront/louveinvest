export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(code);
    this.name = 'ApiClientError';
  }
}

function errorCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('error' in body)) return;
  const error = body.error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  )
    return error.code;
}

/** Empty origin uses the development proxy; production can target the deployed API. */
async function requestApiJson<T>(
  path: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 20_000);
  try {
    const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
    const response = await fetch(`${apiOrigin}${path}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      throw new ApiClientError(errorCode(body) ?? 'HTTP_ERROR', response.status);
    }
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json'))
      throw new ApiClientError('INVALID_RESPONSE');
    try {
      return parse(await response.json());
    } catch {
      throw new ApiClientError('INVALID_RESPONSE');
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) throw new ApiClientError('REQUEST_TIMEOUT');
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError('NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export function getApiJson<T>(path: string, parse: (value: unknown) => T, signal?: AbortSignal) {
  return requestApiJson(path, parse, signal);
}

export function postApiJson<T>(
  path: string,
  body: unknown,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
) {
  return requestApiJson(path, parse, signal, body);
}
