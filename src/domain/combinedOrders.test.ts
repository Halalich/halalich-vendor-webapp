import { describe, expect, it } from 'vitest';
import { deliveryKey, groupOrders } from './combinedOrders';
import type { Order } from '../types';

function order(partial: Partial<Order> & Pick<Order, 'order_id'>): Order {
  return {
    items: [],
    order_status: 'pending',
    total_price: 0,
    cart_total: 0,
    vendor_cart_total: 0,
    discounted_cart_total: 0,
    delivery_fee: 0,
    small_order_fee: 0,
    is_pickup: 'false',
    ...partial,
  };
}

const address = { street: 'Hauptstr. 1', zipcode: '10115', city: 'Berlin' };

describe('groupOrders', () => {
  it('combines one customer\'s orders from different vendors to the same address', () => {
    const groups = groupOrders([
      order({ order_id: 'a', vendor_id: 'v1', user_id: 'u1', delivery_address: address }),
      order({ order_id: 'b', vendor_id: 'v2', user_id: 'u1', delivery_address: { ...address, street: ' hauptstr. 1 ' } }),
      order({ order_id: 'c', vendor_id: 'v3', user_id: 'u1', delivery_address: address }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.combined).toBe(true);
    expect(groups[0]?.orders.map((o) => o.order_id)).toEqual(['a', 'b', 'c']);
  });

  it('uses a shared batch_delivery_id even when addresses are missing', () => {
    const groups = groupOrders([
      order({ order_id: 'a', vendor_id: 'v1', batch_delivery_id: 'B1' }),
      order({ order_id: 'b', vendor_id: 'v2', batch_delivery_id: 'B1' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.combined).toBe(true);
  });

  it('keeps different customers, addresses, dates and pickups apart', () => {
    const groups = groupOrders([
      order({ order_id: 'a', vendor_id: 'v1', user_id: 'u1', delivery_address: address }),
      order({ order_id: 'b', vendor_id: 'v2', user_id: 'u2', delivery_address: address }),
      order({ order_id: 'c', vendor_id: 'v2', user_id: 'u1', delivery_address: { ...address, street: 'Other 2' } }),
      order({ order_id: 'd', vendor_id: 'v3', user_id: 'u1', delivery_address: address, delivery_date: '2026-01-02' }),
      order({ order_id: 'e', vendor_id: 'v3', user_id: 'u1', delivery_address: address, is_pickup: 'true' }),
    ]);
    expect(groups.every((g) => !g.combined)).toBe(true);
    expect(groups).toHaveLength(5);
  });

  it('does not combine two orders of the same vendor', () => {
    const groups = groupOrders([
      order({ order_id: 'a', vendor_id: 'v1', user_id: 'u1', delivery_address: address }),
      order({ order_id: 'b', vendor_id: 'v1', user_id: 'u1', delivery_address: address }),
    ]);
    expect(groups.map((g) => g.combined)).toEqual([false, false]);
  });

  it('never keys pickups', () => {
    expect(deliveryKey(order({ order_id: 'a', user_id: 'u', delivery_address: address, is_pickup: 'true' }))).toBeNull();
  });
});
