import { afterEach, describe, expect, it, vi } from 'vitest';

import { FetchHtmlClient } from '../../../src/infra/http/fetch-html-client.js';

const url = 'https://www.praemiareim.fr/fr/scpi-primopierre';
const htmlResponse = (body = '<html>Market</html>') =>
  new Response(body, { headers: { 'content-type': 'text/html;charset=UTF-8' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('FetchHtmlClient', () => {
  it('requests HTML with a timeout signal and returns the decoded response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse('<html>Marché €</html>'));
    const client = new FetchHtmlClient(fetcher);
    await expect(client.get(url)).resolves.toBe('<html>Marché €</html>');
    expect(fetcher).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        redirect: 'error',
        headers: { Accept: 'text/html' },
      }),
    );
  });

  it('decodes UTF-8 characters spanning chunks', async () => {
    const bytes = new TextEncoder().encode('€');
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 1));
        controller.enqueue(bytes.slice(1));
        controller.close();
      },
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(body, { headers: { 'content-type': 'text/html' } }));
    await expect(new FetchHtmlClient(fetcher).get(url)).resolves.toBe('€');
  });

  it.each([403, 404, 500, 503])('maps HTTP %i to SOURCE_UNAVAILABLE', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('error', { status }));
    await expect(new FetchHtmlClient(fetcher).get(url)).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE',
    });
  });

  it.each(['application/json', 'text/html-fake', ''])(
    'rejects unexpected Content-Type %s',
    async (contentType) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('{}', { headers: { 'content-type': contentType } }));
      await expect(new FetchHtmlClient(fetcher).get(url)).rejects.toMatchObject({
        code: 'SOURCE_FORMAT_CHANGED',
      });
    },
  );

  it('does not expose transport error details as the public error message', async () => {
    const cause = new TypeError('DNS failed');
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(cause);
    await expect(new FetchHtmlClient(fetcher).get(url)).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE',
      cause,
    });
  });

  it('rejects bodies over the byte limit even without Content-Length', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse('€€'));
    await expect(new FetchHtmlClient(fetcher, 1000, 5).get(url)).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE',
    });
  });

  it('rejects oversized advertised Content-Length before reading', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('small', {
        headers: { 'content-type': 'text/html', 'content-length': '1000' },
      }),
    );
    await expect(new FetchHtmlClient(fetcher, 1000, 5).get(url)).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE',
    });
  });

  it('rejects empty documents', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse(' '));
    await expect(new FetchHtmlClient(fetcher).get(url)).rejects.toMatchObject({
      code: 'SOURCE_FORMAT_CHANGED',
    });
  });

  it('aborts slow response headers at the configured deadline', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_, options) =>
        new Promise((_, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const promise = new FetchHtmlClient(fetcher, 50).get(url);
    const check = expect(promise).rejects.toMatchObject({ code: 'SOURCE_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(50);
    await check;
  });

  it('keeps the timeout active while streaming the body', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_, options) => {
      const body = new ReadableStream({
        start(controller) {
          options?.signal?.addEventListener(
            'abort',
            () => controller.error(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        },
      });
      return new Response(body, { headers: { 'content-type': 'text/html' } });
    });
    const promise = new FetchHtmlClient(fetcher, 50).get(url);
    const check = expect(promise).rejects.toMatchObject({ code: 'SOURCE_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(50);
    await check;
  });

  it.each([
    [0, 100],
    [100, 0],
    [-1, 100],
  ])('rejects invalid HTTP options', (timeout, size) => {
    expect(() => new FetchHtmlClient(vi.fn(), timeout, size)).toThrow(RangeError);
  });
});
