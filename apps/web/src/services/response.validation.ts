import { ApiClientError } from './api-client';

export const invalid = (): never => {
  throw new ApiClientError('INVALID_RESPONSE');
};
export function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalid();
}
export function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : invalid();
}
export function integer(value: unknown, minimum = 1): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
    ? value
    : invalid();
}
export function literal<T extends string>(value: unknown, expected: T): T {
  return value === expected ? expected : invalid();
}
export function list<T>(value: unknown, parse: (item: unknown) => T, maximum = Infinity): T[] {
  return Array.isArray(value) && value.length <= maximum ? value.map(parse) : invalid();
}
export function date(value: unknown, localTime = false): string {
  const result = text(value);
  const pattern = localTime ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(result)) return invalid();
  const parsed = new Date(localTime ? result + 'Z' : result + 'T00:00:00Z');
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, localTime ? 19 : 10) !== result
  )
    return invalid();
  return result;
}
