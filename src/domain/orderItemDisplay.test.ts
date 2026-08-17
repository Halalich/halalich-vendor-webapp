import { describe, expect, it } from 'vitest';
import {
  isWholeChickenName,
  quantityLabel,
  unitPriceLabel,
} from './orderItemDisplay';

describe('OrderItemDisplay', () => {
  it('detects whole chicken names', () => {
    expect(isWholeChickenName('Whole chicken')).toBe(true);
    expect(isWholeChickenName('Skinless whole chicken')).toBe(true);
    expect(isWholeChickenName('WHOLE CHICKEN')).toBe(true);
    expect(isWholeChickenName(' skinless whole chicken ')).toBe(true);
  });

  it('rejects non whole chicken names', () => {
    expect(isWholeChickenName('Boneless chicken')).toBe(false);
    expect(isWholeChickenName('Chicken mince')).toBe(false);
    expect(isWholeChickenName('Lamb shoulder')).toBe(false);
    expect(isWholeChickenName(null)).toBe(false);
    expect(isWholeChickenName('')).toBe(false);
  });

  it('pluralizes piece quantity labels', () => {
    expect(quantityLabel(1, true)).toBe('1 Piece');
    expect(quantityLabel(2, true)).toBe('2 Pieces');
    expect(quantityLabel(0, true)).toBe('0 Pieces');
  });

  it('keeps kg labels', () => {
    expect(quantityLabel(1, false)).toBe('1 Kg');
    expect(quantityLabel(4, false)).toBe('4 Kg');
  });

  it('switches unit price labels', () => {
    expect(unitPriceLabel('12.5', true)).toBe('€12.5 / Piece');
    expect(unitPriceLabel('12.5', false)).toBe('€12.5 / Kg');
  });

  it('handles missing price', () => {
    expect(unitPriceLabel(null, true)).toBe('€0 / Piece');
    expect(unitPriceLabel('   ', false)).toBe('€0 / Kg');
  });
});
