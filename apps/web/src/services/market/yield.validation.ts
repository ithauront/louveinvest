import type { ScpiYield, YieldDataSource } from '../../types/yield';
import { integer, invalid, list, object, text } from '../response.validation';
import { parseMarketContext, parseMarketExecution } from './market.validation';

function provenance(value: unknown): YieldDataSource {
  const source = object(value);
  const url = text(source.url);
  try {
    if (!['http:', 'https:'].includes(new URL(url).protocol)) return invalid();
  } catch {
    return invalid();
  }
  const pages = list(source.pages, (item) => integer(item));
  if (!pages.length) return invalid();
  return { url, pages };
}

export function parseScpiYield(value: unknown): ScpiYield {
  const root = object(value),
    dividend = object(root.dividend),
    fees = object(root.fees);
  const year = integer(dividend.year, 1900);
  if (year > 9999 || fees.fixedFeesIncluded !== false) return invalid();
  const commissionBasisPoints = integer(fees.commissionBasisPoints, 0);
  const registrationBasisPoints = integer(fees.registrationBasisPoints, 0);
  if (commissionBasisPoints > 10_000 || registrationBasisPoints > 10_000) return invalid();
  const annualYieldPercent = root.annualYieldPercent;
  if (
    typeof annualYieldPercent !== 'number' ||
    !Number.isFinite(annualYieldPercent) ||
    annualYieldPercent < 0
  )
    return invalid();
  return {
    ...parseMarketContext(value),
    execution: parseMarketExecution(root.execution),
    acquisitionCostPerShareCents: integer(root.acquisitionCostPerShareCents),
    annualYieldPercent,
    dividend: {
      year,
      grossPerShareCents: integer(dividend.grossPerShareCents, 0),
      source: provenance(dividend.source),
    },
    fees: {
      commissionBasisPoints,
      registrationBasisPoints,
      fixedFeesIncluded: false,
      source: provenance(fees.source),
    },
  };
}
