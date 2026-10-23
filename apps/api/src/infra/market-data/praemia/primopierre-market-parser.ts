import { load } from 'cheerio';
import { z, ZodError } from 'zod';

import { MarketSourceError } from '../../../application/secondary-market/errors/market-source-error.js';
import type { MarketSnapshot } from '../../../domain/secondary-market/value-objects/market-snapshot.js';
import { PraemiaParsingError } from './errors/praemia-parsing-error.js';
import {
  normalizeText,
  parseEuroCents,
  parseFrenchDate,
  parseFrenchInteger,
  parseFrenchLocalDateTime,
} from './french-values.js';

type ParsedMarketData = Omit<MarketSnapshot, 'scpi' | 'source'> & { updatedAtLocal: string };
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const executionSchema = z
  .object({
    date: z.string(),
    shares: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    sellerPriceCents: positiveInteger,
    buyerPriceCents: positiveInteger,
  })
  .refine(
    (value) => value.buyerPriceCents >= value.sellerPriceCents,
    'Buyer price below seller price',
  );
const askSchema = z
  .object({
    orderCount: positiveInteger,
    shares: positiveInteger,
    sellerLimitCents: positiveInteger,
  })
  .refine((value) => value.orderCount <= value.shares, 'More orders than shares');
const bidSchema = z
  .object({
    orderCount: positiveInteger,
    shares: positiveInteger,
    sellerLimitCents: positiveInteger,
    buyerLimitCents: positiveInteger,
  })
  .refine(
    (value) => value.orderCount <= value.shares && value.buyerLimitCents >= value.sellerLimitCents,
    'Inconsistent bid level',
  );
const marketSchema = z
  .object({
    updatedAtLocal: z.string(),
    lastExecution: executionSchema,
    nextConfrontation: z.object({ localDateTime: z.string() }),
    orderDeadline: z.object({ localDateTime: z.string() }),
    history: z.array(executionSchema).min(1),
    orderBook: z.object({
      coverage: z.literal('public-top-5-levels'),
      bids: z.array(bidSchema).max(5),
      asks: z.array(askSchema).max(5),
    }),
  })
  .refine(
    (value) => new Set(value.history.map((row) => row.date)).size === value.history.length,
    'Duplicate execution dates',
  )
  .refine(
    (value) =>
      [value.orderBook.bids, value.orderBook.asks].every(
        (levels) => new Set(levels.map((level) => level.sellerLimitCents)).size === levels.length,
      ),
    'Duplicate price levels',
  )
  .refine(
    (value) => value.orderDeadline.localDateTime <= value.nextConfrontation.localDateTime,
    'Deadline after confrontation',
  );

export class PrimopierreMarketParser {
  parse(html: string): ParsedMarketData {
    try {
      return this.extract(html);
    } catch (error) {
      if (error instanceof PraemiaParsingError || error instanceof ZodError) {
        throw new MarketSourceError('SOURCE_FORMAT_CHANGED', 'Invalid Primopierre market HTML', {
          cause: error,
        });
      }
      throw error;
    }
  }

  private extract(html: string): ParsedMarketData {
    const $ = load(html);
    const root = $('section.fixed-capital-web');
    if (
      root.length !== 1 ||
      $('h1')
        .toArray()
        .filter((h) => normalizeText($(h).text()) === 'SCPI Primopierre').length !== 1
    ) {
      throw new PraemiaParsingError(
        'INVALID_STRUCTURE',
        'Missing or ambiguous Primopierre market section',
      );
    }
    const subtitle = root.find('.fixed-capital-subtitle');
    const update = normalizeText(subtitle.text()).match(
      /^Mise à jour le (\d{2}\/\d{2}\/\d{4}) - (\d{2}:\d{2})$/,
    );
    if (subtitle.length !== 1 || !update)
      throw new PraemiaParsingError('INVALID_STRUCTURE', 'Missing source update');

    function indicator(label: string): { value: string; time: string } {
      const matches = root
        .find('.key-item, .key-item-last')
        .toArray()
        .filter((element) => normalizeText($(element).find('.key-label').text()) === label);
      if (matches.length !== 1)
        throw new PraemiaParsingError(
          'INVALID_STRUCTURE',
          `Missing or ambiguous indicator: ${label}`,
        );
      const number = $(matches[0]).find('.key-number');
      const time = $(matches[0]).find('.key-date');
      if (number.length !== 1 || time.length > 1)
        throw new PraemiaParsingError('INVALID_STRUCTURE', `Invalid indicator: ${label}`);
      return { value: number.text(), time: time.text() };
    }

    function tableRows(selector: string, headers: string[]): string[][] {
      const table = root.find(selector);
      return readTable(table, headers);
    }

    function readTable(table: typeof root, headers: string[]): string[][] {
      if (table.length !== 1)
        throw new PraemiaParsingError('INVALID_STRUCTURE', 'Missing or ambiguous market table');
      const actualHeaders = table
        .find('thead th')
        .toArray()
        .map((h) => normalizeText($(h).text()));
      if (
        JSON.stringify(actualHeaders) !== JSON.stringify(headers) ||
        table.find('tbody').length !== 1
      ) {
        throw new PraemiaParsingError('INVALID_STRUCTURE', 'Market table structure changed');
      }
      return table
        .find('tbody > tr')
        .toArray()
        .map((row) => {
          const cells = $(row).children('td');
          if (
            cells.length !== headers.length ||
            cells.toArray().some((cell) => $(cell).attr('colspan'))
          ) {
            throw new PraemiaParsingError(
              'INVALID_STRUCTURE',
              'Market table row structure changed',
            );
          }
          return cells.toArray().map((cell) => normalizeText($(cell).text()));
        });
    }

    function orderRows(title: string, headers: string[]): string[][] {
      const headings = root
        .find('h3.fixed-capital-table-title')
        .toArray()
        .filter((h) => normalizeText($(h).text()) === title);
      if (headings.length !== 1)
        throw new PraemiaParsingError('INVALID_STRUCTURE', `Missing order book heading: ${title}`);
      return readTable($(headings[0]).parent().children('table'), headers);
    }

    const history = tableRows('#historic-table table', [
      'Date',
      'Nombre de parts échangées',
      'Prix vendeur',
      'Prix acquéreur',
    ])
      .map(([date, shares, seller, buyer]) => ({
        date: parseFrenchDate(date),
        shares: parseFrenchInteger(shares),
        sellerPriceCents: parseEuroCents(seller),
        buyerPriceCents: parseEuroCents(buyer),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastExecution = history[0];
    if (!lastExecution)
      throw new PraemiaParsingError('INVALID_STRUCTURE', 'No historical execution available');
    const seller = indicator("Dernier prix d'exécution constaté (Prix net revenant au vendeur)");
    const buyer = indicator('Dernier prix acquéreur constaté (Prix frais inclus)');
    if (
      lastExecution.sellerPriceCents !== parseEuroCents(seller.value) ||
      lastExecution.buyerPriceCents !== parseEuroCents(buyer.value)
    ) {
      throw new PraemiaParsingError(
        'INCONSISTENT_DATA',
        'Latest historical execution disagrees with indicators',
      );
    }
    const next = indicator('Date et heure de la prochaine confrontation');
    const deadline = indicator('Date limite de réception des ordres');
    const bids = orderRows("Les 5 ordres d'achat les plus hauts", [
      "Nombre d'ordres",
      'Nombre de parts',
      'Prix vendeur',
      'Prix acquéreur',
    ])
      .map(([orders, shares, seller, buyer]) => ({
        orderCount: parseFrenchInteger(orders),
        shares: parseFrenchInteger(shares),
        sellerLimitCents: parseEuroCents(seller),
        buyerLimitCents: parseEuroCents(buyer),
      }))
      .sort((a, b) => b.sellerLimitCents - a.sellerLimitCents);
    const asks = orderRows('Les 5 ordres de vente les plus bas', [
      "Nombre d'ordres",
      'Nombre de parts',
      'Prix vendeur',
    ])
      .map(([orders, shares, seller]) => ({
        orderCount: parseFrenchInteger(orders),
        shares: parseFrenchInteger(shares),
        sellerLimitCents: parseEuroCents(seller),
      }))
      .sort((a, b) => a.sellerLimitCents - b.sellerLimitCents);

    return marketSchema.parse({
      updatedAtLocal: parseFrenchLocalDateTime(update[1], update[2]),
      lastExecution,
      nextConfrontation: { localDateTime: parseFrenchLocalDateTime(next.value, next.time) },
      orderDeadline: { localDateTime: parseFrenchLocalDateTime(deadline.value, deadline.time) },
      history,
      orderBook: { coverage: 'public-top-5-levels', bids, asks },
    });
  }
}
