import { describe, expect, it } from 'vitest';
import { parsePrice } from './price';

const EPS = 0.0001;

describe('parsePrice', () => {
  it('parses dot decimal', () => {
    expect(parsePrice('12.50')).toBeCloseTo(12.5, 4);
  });

  it('parses comma decimal', () => {
    expect(parsePrice('12,50')).toBeCloseTo(12.5, 4);
  });

  it('parses US thousands with dot decimal', () => {
    expect(parsePrice('1,234.56')).toBeCloseTo(1234.56, 4);
  });

  it('parses European thousands with comma decimal', () => {
    expect(parsePrice('1.234,56')).toBeCloseTo(1234.56, 4);
  });

  it('strips currency symbol and whitespace', () => {
    expect(parsePrice('  €9.99 ')).toBeCloseTo(9.99, 4);
  });

  it('null returns zero', () => {
    expect(parsePrice(null)).toBeCloseTo(0, 4);
  });

  it('empty and blank return zero', () => {
    expect(parsePrice('')).toBeCloseTo(0, EPS);
    expect(parsePrice('   ')).toBeCloseTo(0, EPS);
  });

  it('non numeric returns zero', () => {
    expect(parsePrice('abc')).toBeCloseTo(0, EPS);
  });

  it('plain integer string parses', () => {
    expect(parsePrice('7')).toBeCloseTo(7, EPS);
  });
});
