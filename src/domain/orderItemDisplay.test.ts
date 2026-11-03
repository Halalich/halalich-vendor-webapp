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

  it('labels stk quantities without plural', () => {
    expect(quantityLabel(1, true)).toBe('1 stk');
    expect(quantityLabel(2, true)).toBe('2 stk');
    expect(quantityLabel(0, true)).toBe('0 stk');
  });

  it('keeps kg labels', () => {
    expect(quantityLabel(1, false)).toBe('1 kg');
    expect(quantityLabel(4, false)).toBe('4 kg');
  });

  it('switches unit price labels', () => {
    expect(unitPriceLabel('12.5', true)).toBe('€12.5 / stk');
    expect(unitPriceLabel('12.5', false)).toBe('€12.5 / kg');
  });

  it('handles missing price', () => {
    expect(unitPriceLabel(null, true)).toBe('€0 / stk');
    expect(unitPriceLabel('   ', false)).toBe('€0 / kg');
  });
});
