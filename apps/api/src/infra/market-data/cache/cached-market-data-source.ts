import type { MarketDataResult } from '../../../application/secondary-market/dtos/market-data-result.js';
import { MarketSourceError } from '../../../application/secondary-market/errors/market-source-error.js';
import type { MarketDataSource } from '../../../application/secondary-market/ports/market-data-source.js';

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const DEFAULT_CACHE_VALIDITY_MS = 30 * MILLISECONDS_PER_MINUTE;
const DEFAULT_MAXIMUM_SNAPSHOT_AGE_MS = 2 * MILLISECONDS_PER_HOUR;

export interface MarketCacheOptions {
  /** How long a successful collection can be reused without refreshing (default: 30 minutes). */
  readonly cacheValidityMs?: number;
  /** Total age allowed for fallback after refresh failure (default: 2 hours, including validity). */
  readonly maximumSnapshotAgeMs?: number;
  /** Monotonic milliseconds, injectable for deterministic tests. */
  readonly now?: () => number;
}

/** One instance per registered SCPI; cache entries are never shared across providers. */
export class CachedMarketDataSource implements MarketDataSource {
  private readonly cacheValidityMs: number;
  private readonly maximumSnapshotAgeMs: number;
  private readonly now: () => number;
  private cached?: { result: MarketDataResult; storedAt: number };
  private inFlight?: Promise<MarketDataResult>;

  constructor(
    private readonly source: MarketDataSource,
    options: MarketCacheOptions = {},
  ) {
    this.cacheValidityMs = options.cacheValidityMs ?? DEFAULT_CACHE_VALIDITY_MS;
    this.maximumSnapshotAgeMs = options.maximumSnapshotAgeMs ?? DEFAULT_MAXIMUM_SNAPSHOT_AGE_MS;
    this.now = options.now ?? (() => performance.now());
    if (
      !Number.isSafeInteger(this.cacheValidityMs) ||
      this.cacheValidityMs <= 0 ||
      !Number.isSafeInteger(this.maximumSnapshotAgeMs) ||
      this.maximumSnapshotAgeMs < this.cacheValidityMs
    ) {
      throw new RangeError(
        'Cache ages must be positive integers and maximumSnapshotAgeMs must be >= cacheValidityMs',
      );
    }
  }

  async fetch(): Promise<MarketDataResult> {
    if (this.cached && this.age() < this.cacheValidityMs) {
      return structuredClone(this.cached.result);
    }
    if (this.inFlight) return structuredClone(await this.inFlight);

    const pending = this.refresh();
    this.inFlight = pending;
    try {
      return structuredClone(await pending);
    } finally {
      this.inFlight = undefined;
    }
  }

  private age(): number {
    return this.cached ? this.now() - this.cached.storedAt : Infinity;
  }

  private async refresh(): Promise<MarketDataResult> {
    try {
      const result: MarketDataResult = await this.source.fetch();
      // Do not cache a stale fallback supplied by another decorator as a new collection.
      if (result.freshness !== 'fresh') return result;
      const cachedResult = structuredClone(result);
      this.cached = { result: cachedResult, storedAt: this.now() };
      return cachedResult;
    } catch (error) {
      if (
        error instanceof MarketSourceError &&
        this.cached &&
        this.age() < this.maximumSnapshotAgeMs
      ) {
        return {
          ...this.cached.result,
          freshness: 'stale',
          warnings: [
            {
              code: 'STALE_DATA',
              message: 'Refresh failed. Showing the last successfully collected market data.',
            },
          ],
        };
      }
      throw error;
    }
  }
}
