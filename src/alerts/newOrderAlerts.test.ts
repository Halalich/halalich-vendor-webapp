import { describe, expect, it } from 'vitest';
import { collectNewPendingAlerts } from './newOrderAlerts';
import type { Order } from '../types';

function order(partial: Partial<Order> & Pick<Order, 'order_id' | 'order_status'>): Order {
  return {
    items: [],
    total_price: 0,
    cart_total: 0,
    vendor_cart_total: 0,
    discounted_cart_total: 0,
    delivery_fee: 0,
    small_order_fee: 0,
    ...partial,
  };
}

describe('collectNewPendingAlerts', () => {
  it('seeds existing ids without alerting', () => {
    const seen = new Set<string>();
    const result = collectNewPendingAlerts(
      [
        order({ order_id: 'a', order_status: 'pending', items: [{ product_name: 'x', quantity: 2, price_per_unit: '1', vendor_price: '1' }] }),
        order({ order_id: 'b', order_status: 'accepted' }),
      ],
      seen,
      false,
    );

    expect(result.alerts).toEqual([]);
    expect(result.seeded).toBe(true);
    expect(seen.has('a')).toBe(true);
    expect(seen.has('b')).toBe(true);
  });

  it('alerts only newly seen pending orders', () => {
    const seen = new Set(['a']);
    const result = collectNewPendingAlerts(
      [
        order({ order_id: 'a', order_status: 'pending' }),
        order({
          order_id: 'c',
          order_status: 'pending',
          items: [
            { product_name: 'x', quantity: 1, price_per_unit: '1', vendor_price: '1' },
            { product_name: 'y', quantity: 3, price_per_unit: '1', vendor_price: '1' },
          ],
        }),
        order({ order_id: 'd', order_status: 'accepted' }),
      ],
      seen,
      true,
    );

    expect(result.alerts).toEqual([{ orderId: 'c', status: 'pending', itemCount: 4 }]);
    expect(seen.has('c')).toBe(true);
    expect(seen.has('d')).toBe(true);
  });
});
