import { describe, expect, it } from 'vitest';
import { calculateEarnings } from './earnings';
import type { Order } from '../types';

function delivered(orderDate: string | undefined, vendorCartTotal: number, cartTotal: number): Order {
  return {
    order_id: 'o',
    items: [],
    order_date: orderDate,
    order_status: 'delivered',
    total_price: 0,
    cart_total: cartTotal,
    vendor_cart_total: vendorCartTotal,
    discounted_cart_total: 0,
    delivery_fee: 0,
    small_order_fee: 0,
  };
}

const june = { year: 2026, month: 6 };

describe('EarningsCalculator', () => {
  it('uses vendor cart total when present', () => {
    const s = calculateEarnings([delivered('2026-06-01T10:00:00', 80, 100)], june);
    expect(s.thisMonthEarnings).toBeCloseTo(80, 3);
    expect(s.totalEarnings).toBeCloseTo(80, 3);
  });

  it('falls back to cart total for legacy orders', () => {
    const s = calculateEarnings([delivered('2026-06-01T10:00:00', 0, 55)], june);
    expect(s.thisMonthEarnings).toBeCloseTo(55, 3);
  });

  it('same month last year is not this month', () => {
    const s = calculateEarnings(
      [
        delivered('2025-06-15T10:00:00', 40, 40),
        delivered('2026-06-15T10:00:00', 10, 10),
      ],
      june,
    );
    expect(s.thisMonthEarnings).toBeCloseTo(10, 3);
    expect(s.totalEarnings).toBeCloseTo(50, 3);
    expect(s.thisMonthOrders).toBe(1);
    expect(s.totalOrders).toBe(2);
  });

  it('last month bucket respects year boundary', () => {
    const s = calculateEarnings([delivered('2025-12-20T10:00:00', 30, 30)], {
      year: 2026,
      month: 1,
    });
    expect(s.lastMonthEarnings).toBeCloseTo(30, 3);
    expect(s.thisMonthEarnings).toBeCloseTo(0, 3);
  });

  it('unparseable dates are skipped not fatal', () => {
    const s = calculateEarnings(
      [
        delivered('garbage', 10, 10),
        delivered(undefined, 10, 10),
        delivered('2026-06-01 09:00:00', 20, 20),
      ],
      june,
    );
    expect(s.thisMonthEarnings).toBeCloseTo(20, 3);
    expect(s.totalEarnings).toBeCloseTo(40, 3);
    expect(s.skippedDates).toBe(2);
  });

  it('growth percent handles zero last month', () => {
    const s = calculateEarnings([delivered('2026-06-01T10:00:00', 10, 10)], june);
    expect(s.earningsGrowthPercent).toBeCloseTo(100, 3);
    const empty = calculateEarnings([], june);
    expect(empty.earningsGrowthPercent).toBeCloseTo(0, 3);
  });

  it('accepts millisecond and offset date variants', () => {
    const s = calculateEarnings(
      [
        delivered('2026-06-01T10:00:00.000', 5, 5),
        delivered('2026-06-02T10:00:00+02:00', 7, 7),
      ],
      june,
    );
    expect(s.thisMonthEarnings).toBeCloseTo(12, 3);
    expect(s.skippedDates).toBe(0);
  });

  it('negative growth is computed correctly', () => {
    const s = calculateEarnings(
      [
        delivered('2026-05-10T10:00:00', 100, 100),
        delivered('2026-06-10T10:00:00', 50, 50),
      ],
      june,
    );
    expect(s.earningsGrowthPercent).toBeCloseTo(-50, 3);
  });
});
