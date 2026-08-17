import { describe, expect, it } from 'vitest';
import { decrement, hasChanged, parseQty } from './stock';

describe('StockMath', () => {
  it('parses plain and decimal input', () => {
    expect(parseQty('5', -1)).toBeCloseTo(5, 3);
    expect(parseQty('0.5', -1)).toBeCloseTo(0.5, 3);
    expect(parseQty('5,0', -1)).toBeCloseTo(5, 3);
  });

  it('falls back on garbage', () => {
    expect(parseQty('', 3)).toBeCloseTo(3, 3);
    expect(parseQty(null, 3)).toBeCloseTo(3, 3);
    expect(parseQty('abc', 3)).toBeCloseTo(3, 3);
    expect(parseQty('-', 3)).toBeCloseTo(3, 3);
  });

  it('decrement floors at zero', () => {
    expect(decrement(2)).toBeCloseTo(1, 3);
    expect(decrement(1)).toBeCloseTo(0, 3);
    expect(decrement(0.5)).toBeCloseTo(0, 3);
    expect(decrement(0)).toBeCloseTo(0, 3);
  });

  it('change detection is numeric', () => {
    expect(hasChanged('5.0', 5)).toBe(false);
    expect(hasChanged('5', 5)).toBe(false);
    expect(hasChanged('4', 5)).toBe(true);
    expect(hasChanged('garbage', 5)).toBe(false);
  });
});
