/** Numeric helpers for stock quantity UI — matches Android StockMath. */

export function parseQty(input: string | null | undefined, fallback: number): number {
  if (input == null) return fallback;
  const normalized = input.trim().replace(',', '.');
  if (normalized === '') return fallback;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : fallback;
}

export function decrement(qty: number): number {
  return Math.max(0, qty - 1);
}

export function increment(qty: number): number {
  return qty + 1;
}

export function hasChanged(input: string, current: number): boolean {
  const parsed = parseQty(input, current);
  return Math.abs(parsed - current) > 0.0001;
}
