import { PraemiaParsingError } from './errors/praemia-parsing-error.js';

export function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

function safeInteger(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new PraemiaParsingError('UNSAFE_INTEGER', 'Value exceeds safe integer precision');
  return value;
}

export function parseFrenchInteger(value: string): number {
  const normalized = normalizeText(value);
  if (!/^(?:\d+|\d{1,3}(?: \d{3})+)$/.test(normalized)) {
    throw new PraemiaParsingError('INVALID_INTEGER', 'Invalid French integer');
  }
  return safeInteger(Number(normalized.replace(/ /g, '')));
}

export function parseEuroCents(value: string): number {
  const match = normalizeText(value).match(
    /^(\d+|\d{1,3}(?: \d{3})+)(?:,(\d{1,2}))?\s*€(?:\s*\/\s*Part)?$/i,
  );
  if (!match) throw new PraemiaParsingError('INVALID_AMOUNT', 'Invalid euro amount');
  const euros = parseFrenchInteger(match[1]);
  return safeInteger(euros * 100 + Number((match[2] ?? '').padEnd(2, '0')));
}

export function parseFrenchDate(value: string): string {
  const match = normalizeText(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new PraemiaParsingError('INVALID_DATE', 'Invalid French date');
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    Number(year) < 1000 ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new PraemiaParsingError('INVALID_DATE', 'Invalid calendar date');
  }
  return `${year}-${month}-${day}`;
}

export function parseFrenchLocalDateTime(date: string, time: string): string {
  const normalized = normalizeText(time);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized))
    throw new PraemiaParsingError('INVALID_TIME', 'Invalid local time');
  return `${parseFrenchDate(date)}T${normalized}:00`;
}
