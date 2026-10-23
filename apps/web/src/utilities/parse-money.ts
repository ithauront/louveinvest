/** Parse decimal euros exactly; never round an input with more than two decimal places. */
export function parseMoneyCents(value: string, allowZero = false): number | null {
  const match = value.trim().match(/^(\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.](\d{1,2}))?$/);
  if (!match) return null;
  const cents =
    BigInt(match[1].replace(/\s/g, '')) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return cents >= (allowZero ? 0n : 1n) && cents <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(cents)
    : null;
}
