import type { MarketExecution, MarketOrderLevel, ScpiMarket } from '../../types/market';
import { date, integer, invalid, list, literal, object, text } from '../response.validation';

export function parseMarketExecution(value: unknown): MarketExecution {
  const item = object(value);
  return {
    date: date(item.date),
    shares: integer(item.shares, 0),
    sellerPriceCents: integer(item.sellerPriceCents),
    buyerPriceCents: integer(item.buyerPriceCents),
  };
}
function level(value: unknown): MarketOrderLevel {
  const item = object(value);
  return {
    orderCount: integer(item.orderCount),
    shares: integer(item.shares),
    sellerLimitCents: integer(item.sellerLimitCents),
  };
}

/** Decode every consumed field at the HTTP boundary instead of asserting a TypeScript type. */
export function parseMarketContext(
  value: unknown,
): Pick<ScpiMarket, 'scpi' | 'source' | 'freshness' | 'warnings'> {
  const root = object(value),
    scpi = object(root.scpi),
    source = object(root.source);
  const url = text(source.url);
  try {
    if (!['https:', 'http:'].includes(new URL(url).protocol)) return invalid();
  } catch {
    return invalid();
  }
  const fetchedAt = text(source.fetchedAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(fetchedAt) ||
    !Number.isFinite(Date.parse(fetchedAt))
  )
    return invalid();
  date(fetchedAt.slice(0, 19), true);
  const freshness =
    root.freshness === 'fresh' || root.freshness === 'stale' ? root.freshness : invalid();
  return {
    scpi: { id: text(scpi.id), name: text(scpi.name), manager: text(scpi.manager) },
    source: {
      url,
      fetchedAt,
      updatedAtLocal: date(source.updatedAtLocal, true),
      timeZone: literal(source.timeZone, 'Europe/Paris'),
    },
    freshness,
    warnings: list(root.warnings, (item) => {
      const warning = object(item);
      return { code: literal(warning.code, 'STALE_DATA'), message: text(warning.message) };
    }),
  };
}

export function parseScpiMarket(value: unknown): ScpiMarket {
  const root = object(value),
    book = object(root.orderBook);
  return {
    ...parseMarketContext(value),
    lastExecution: parseMarketExecution(root.lastExecution),
    nextConfrontation: { localDateTime: date(object(root.nextConfrontation).localDateTime, true) },
    orderDeadline: { localDateTime: date(object(root.orderDeadline).localDateTime, true) },
    history: list(root.history, parseMarketExecution),
    orderBook: {
      coverage: literal(book.coverage, 'public-top-5-levels'),
      bids: list(
        book.bids,
        (item) => ({ ...level(item), buyerLimitCents: integer(object(item).buyerLimitCents) }),
        5,
      ),
      asks: list(book.asks, level, 5),
    },
  };
}
