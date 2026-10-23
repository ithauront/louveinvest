/** Exact cent formatting, even for values near Number.MAX_SAFE_INTEGER. */
export function formatEuroCents(cents: number): string {
  const integer = BigInt(cents);
  const euros = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(integer / 100n);
  return `${euros},${(integer % 100n).toString().padStart(2, '0')}\u00a0€`;
}
