import { MarketSourceError } from '../../application/secondary-market/errors/market-source-error.js';
import type { HtmlClient } from './html-client.js';

export class FetchHtmlClient implements HtmlClient {
  constructor(
    private readonly fetcher: typeof fetch = globalThis.fetch,
    private readonly timeoutMs = 10_000,
    private readonly maxBytes = 2_000_000,
  ) {
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs <= 0 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes <= 0
    ) {
      throw new RangeError('HTTP timeout and size limit must be positive integers');
    }
  }

  async get(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(url, {
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new MarketSourceError('SOURCE_UNAVAILABLE', `Source HTTP status ${response.status}`);
      }
      if (!/^text\/html(?:\s*;|\s*$)/i.test(response.headers.get('content-type') ?? '')) {
        await response.body?.cancel();
        throw new MarketSourceError('SOURCE_FORMAT_CHANGED', 'Expected an HTML response');
      }
      if (Number(response.headers.get('content-length')) > this.maxBytes) {
        await response.body?.cancel();
        throw new MarketSourceError('SOURCE_UNAVAILABLE', 'HTML response exceeds size limit');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new MarketSourceError('SOURCE_UNAVAILABLE', 'Empty response body');
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let html = '';
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > this.maxBytes) {
            await reader.cancel();
            throw new MarketSourceError('SOURCE_UNAVAILABLE', 'HTML response exceeds size limit');
          }
          html += decoder.decode(value, { stream: true });
        }
        html += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      if (!html.trim()) throw new MarketSourceError('SOURCE_FORMAT_CHANGED', 'Empty HTML document');
      return html;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new MarketSourceError('SOURCE_TIMEOUT', 'Market source timed out', { cause: error });
      }
      if (error instanceof MarketSourceError) throw error;
      throw new MarketSourceError('SOURCE_UNAVAILABLE', 'Cannot retrieve market source', {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
