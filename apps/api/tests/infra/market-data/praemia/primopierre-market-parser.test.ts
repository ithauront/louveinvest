import { load } from 'cheerio';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { PraemiaParsingError } from '../../../../src/infra/market-data/praemia/errors/praemia-parsing-error.js';
import * as frenchValues from '../../../../src/infra/market-data/praemia/french-values.js';
import { PrimopierreMarketParser } from '../../../../src/infra/market-data/praemia/primopierre-market-parser.js';
import { marketHtml } from '../../../helpers/market-fixture.js';

const parser = new PrimopierreMarketParser();

function change(edit: (document: ReturnType<typeof load>) => void): string {
  const $ = load(marketHtml);
  edit($);
  return $.html();
}

describe('PrimopierreMarketParser', () => {
  it('extracts the observed executions, deadlines and aggregated levels in cents', () => {
    const result = parser.parse(marketHtml);
    expect(result.updatedAtLocal).toBe('2026-10-21T15:39:00');
    expect(result.lastExecution).toEqual({
      date: '2026-09-24',
      shares: 364,
      sellerPriceCents: 3188,
      buyerPriceCents: 3500,
    });
    expect(result.history).toHaveLength(7);
    expect(result.nextConfrontation.localDateTime).toBe('2026-10-29T16:00:00');
    expect(result.orderDeadline.localDateTime).toBe('2026-10-27T16:00:00');
    expect(result.orderBook.coverage).toBe('public-top-5-levels');
    expect(result.orderBook.bids).toHaveLength(3);
    expect(result.orderBook.asks).toHaveLength(5);
    expect(result.orderBook.bids[1]).toEqual({
      orderCount: 2,
      shares: 1000,
      sellerLimitCents: 2000,
      buyerLimitCents: 2196,
    });
    expect(result.orderBook.asks[0]).toEqual({
      orderCount: 2,
      shares: 752,
      sellerLimitCents: 2000,
    });
  });

  it('locates tables by section rather than their global position and sorts executions by date', () => {
    const html = change(($) => {
      $('body').prepend('<table><tbody><tr><td>unrelated</td></tr></tbody></table>');
      const body = $('#historic-table tbody');
      body.append(body.children().first());
    });
    expect(parser.parse(html).lastExecution.date).toBe('2026-09-24');
  });

  it('sorts price levels independently from presentation order', () => {
    const html = change(($) => {
      const body = $('h3.fixed-capital-table-title').first().parent().find('tbody');
      body.append(body.children().first());
    });
    expect(parser.parse(html).orderBook.bids.map((level) => level.sellerLimitCents)).toEqual([
      3188, 2000, 1000,
    ]);
  });

  it('accepts empty books only when their headings, tables, headers and bodies remain present', () => {
    const html = change(($) => {
      $('h3.fixed-capital-table-title').each((_, h) => {
        $(h).parent().find('tbody').empty();
      });
    });
    expect(parser.parse(html).orderBook).toEqual({
      coverage: 'public-top-5-levels',
      bids: [],
      asks: [],
    });
  });

  const invalidChanges: [string, (document: ReturnType<typeof load>) => void][] = [
    [
      'missing market section',
      ($) => {
        $('section').remove();
      },
    ],
    [
      'wrong fund',
      ($) => {
        $('h1').text('SCPI Primovie');
      },
    ],
    [
      'missing order table',
      ($) => {
        $('h3.fixed-capital-table-title').last().parent().find('table').remove();
      },
    ],
    [
      'changed headers',
      ($) => {
        $('#historic-table th').first().text('Different');
      },
    ],
    [
      'missing row cell',
      ($) => {
        $('#historic-table tbody tr').first().find('td').last().remove();
      },
    ],
    [
      'invalid date',
      ($) => {
        $('#historic-table tbody tr').first().find('td').first().text('31/02/2026');
      },
    ],
    [
      'invalid amount',
      ($) => {
        $('#historic-table tbody tr').first().find('td').eq(2).text('unknown');
      },
    ],
    [
      'KPI disagreement',
      ($) => {
        $('.key-number').first().text('32,00 € / Part');
      },
    ],
    [
      'empty history',
      ($) => {
        $('#historic-table tbody').empty();
      },
    ],
    [
      'duplicate execution',
      ($) => {
        $('#historic-table tbody').append($('#historic-table tbody tr').first().clone());
      },
    ],
    [
      'missing update',
      ($) => {
        $('.fixed-capital-subtitle').remove();
      },
    ],
    [
      'missing KPI',
      ($) => {
        $('.key-item').first().remove();
      },
    ],
    [
      'deadline after confrontation',
      ($) => {
        $('.key-item-last .key-number').text('30/10/2026');
      },
    ],
    [
      'negative shares',
      ($) => {
        $('h3.fixed-capital-table-title').first().parent().find('tbody td').eq(1).text('-2');
      },
    ],
    [
      'zero shares',
      ($) => {
        $('h3.fixed-capital-table-title').first().parent().find('tbody td').eq(1).text('0');
      },
    ],
    [
      'more orders than shares',
      ($) => {
        $('h3.fixed-capital-table-title').first().parent().find('tbody td').first().text('19');
      },
    ],
    [
      'duplicate price level',
      ($) => {
        const body = $('h3.fixed-capital-table-title').first().parent().find('tbody');
        body.append(body.children().first().clone());
      },
    ],
  ];
  it.each(invalidChanges)(
    'reports SOURCE_FORMAT_CHANGED for %s instead of returning invented data',
    (_, edit) => {
      expect(() => parser.parse(change(edit))).toThrow(
        expect.objectContaining({ code: 'SOURCE_FORMAT_CHANGED' }),
      );
    },
  );
  it('preserves the typed parsing diagnostic as the cause of a source error', () => {
    const html = change(($) => {
      $('.key-number').first().text('32,00 € / Part');
    });
    expect(() => parser.parse(html)).toThrow(
      expect.objectContaining({
        code: 'SOURCE_FORMAT_CHANGED',
        cause: expect.objectContaining({
          name: 'PraemiaParsingError',
          reason: 'INCONSISTENT_DATA',
        }),
      }),
    );
  });

  it('preserves schema validation details for diagnostics', () => {
    const html = change(($) => {
      $('h3.fixed-capital-table-title').first().parent().find('tbody td').eq(1).text('0');
    });
    expect(() => parser.parse(html)).toThrow(
      expect.objectContaining({
        code: 'SOURCE_FORMAT_CHANGED',
        cause: expect.any(ZodError),
      }),
    );
  });

  it('keeps structural failures distinct from invalid numeric values', () => {
    expect(() => parser.parse('<h1>Maintenance</h1>')).toThrow(
      expect.objectContaining({
        cause: expect.objectContaining({ reason: 'INVALID_STRUCTURE' }),
      }),
    );
    const html = change(($) => {
      $('.key-number').first().text('unknown');
    });
    expect(() => parser.parse(html)).toThrow(
      expect.objectContaining({
        cause: expect.any(PraemiaParsingError),
      }),
    );
  });

  it('does not disguise unexpected programming errors as source format failures', () => {
    const bug = new TypeError('Unexpected internal failure');
    vi.spyOn(frenchValues, 'normalizeText').mockImplementationOnce(() => {
      throw bug;
    });
    expect(() => parser.parse(marketHtml)).toThrow(bug);
  });
});
