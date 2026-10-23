export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

/** The API's civil dates are already Paris wall-clock values; never interpret them in the browser timezone. */
export function formatMarketDate(value: string): string {
  const includesTime = value.includes('T');
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(includesTime ? ({ hour: '2-digit', minute: '2-digit' } as const) : {}),
  }).format(new Date(includesTime ? `${value}Z` : `${value}T00:00:00Z`));
}

export function formatCollectedAt(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** The API already returns percentage units: 13.027 is 13.027%, not a ratio. */
export function formatYieldPercent(value: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(value)}\u00a0%`;
}

export function formatBasisPoints(value: number): string {
  return formatYieldPercent(value / 100);
}
