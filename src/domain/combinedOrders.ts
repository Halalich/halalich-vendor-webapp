import type { Order } from '../types';
import { isPickup } from './text';
import { vendorOrderTotal } from './orders';

export interface OrderGroup {
  key: string;
  orders: Order[];
  /** True when the group holds orders of at least two different vendors for one delivery. */
  combined: boolean;
}

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Identifies the delivery an order belongs to, or null when it can't be combined.
 * A shared `batch_delivery_id` wins; otherwise the same customer, address and
 * delivery date make one delivery. Pickup orders are never combined.
 */
export function deliveryKey(order: Order): string | null {
  if (isPickup(order.is_pickup)) return null;
  if (order.batch_delivery_id) return `batch:${order.batch_delivery_id}`;
  const address = order.delivery_address;
  if (!order.user_id || !address) return null;
  const where = [address.street, address.zipcode, address.city, address.bell_name]
    .map(normalize)
    .join('|');
  if (!where.replace(/\|/g, '')) return null;
  return `user:${order.user_id}|${where}|${normalize(order.delivery_date)}`;
}

/** Groups orders of the same delivery across vendors, keeping the incoming order. */
export function groupOrders(orders: Order[]): OrderGroup[] {
  const groups: OrderGroup[] = [];
  const byKey = new Map<string, Order[]>();
  const slots: { key: string; orders: Order[] }[] = [];

  for (const order of orders) {
    const key = deliveryKey(order);
    if (key == null) {
      slots.push({ key: `order:${order.vendor_id ?? ''}:${order.order_id}`, orders: [order] });
      continue;
    }
    const existing = byKey.get(key);
    if (existing) {
      existing.push(order);
    } else {
      const list = [order];
      byKey.set(key, list);
      slots.push({ key, orders: list });
    }
  }

  for (const slot of slots) {
    const vendors = new Set(slot.orders.map((o) => o.vendor_id ?? ''));
    if (slot.orders.length > 1 && vendors.size > 1) {
      groups.push({ key: slot.key, orders: slot.orders, combined: true });
    } else {
      // Not a multi-vendor delivery: keep each order on its own card.
      for (const order of slot.orders) {
        groups.push({
          key: `order:${order.vendor_id ?? ''}:${order.order_id}`,
          orders: [order],
          combined: false,
        });
      }
    }
  }
  return groups;
}

export function groupVendorTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + vendorOrderTotal(order), 0);
}
