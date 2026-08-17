import type { Category, Order, OrderBuckets, OrderItem, Product } from '../types';
import { emptyBuckets } from '../types';
import { isPickup } from './text';
import { parsePrice } from './price';
import { isPerPieceProduct } from './orderItemDisplay';

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function asString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  if (typeof value === 'number') return value !== 0;
  return false;
}

export function mapOrderItems(
  orderId: string,
  items: Record<string, Record<string, unknown>> | OrderItem[] | null | undefined,
): OrderItem[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  return Object.values(items).map((raw) => ({
    order_id: asString(raw.order_id ?? orderId),
    product_name: asString(raw.product_name),
    quantity: Math.trunc(asNumber(raw.quantity)),
    price_per_unit: asString(raw.price_per_unit),
    vendor_price: asString(raw.vendor_price),
    vendor_id: asString(raw.vendor_id),
    instructions: asString(raw.instructions),
    discount_percentage: asNumber(raw.discount_percentage),
  }));
}

export function mapApiOrder(orderId: string, raw: Record<string, unknown>): Order {
  const items = mapOrderItems(
    orderId,
    raw.items as Record<string, Record<string, unknown>> | undefined,
  );
  return {
    order_id: orderId,
    batch_delivery_id: asString(raw.batch_delivery_id) || undefined,
    items,
    order_date: asString(raw.order_date) || undefined,
    payment_method: asString(raw.payment_method) || undefined,
    payment_status: asString(raw.payment_status) || undefined,
    order_status: asString(raw.order_status ?? raw.status) || 'pending',
    total_price: asNumber(raw.total_price),
    user_id: asString(raw.user_id) || undefined,
    delivery_address: (raw.delivery_address as Order['delivery_address']) ?? undefined,
    vendor_id: asString(raw.vendor_id) || undefined,
    cart_total: asNumber(raw.cart_total),
    vendor_cart_total: asNumber(raw.vendor_cart_total),
    discounted_cart_total: asNumber(raw.discounted_cart_total),
    coupon_code: asString(raw.coupon_code) || undefined,
    delivery_fee: asNumber(raw.delivery_fee),
    small_order_fee: asNumber(raw.small_order_fee),
    tax: asNumber(raw.tax),
    is_pickup: asString(raw.is_pickup) || undefined,
    scheduled_pickup_time: asString(raw.scheduled_pickup_time) || undefined,
    vendor_name: asString(raw.vendor_name) || undefined,
    delivery_date: asString(raw.delivery_date) || undefined,
  };
}

export function bucketOrders(orders: Order[]): OrderBuckets {
  const buckets = emptyBuckets();
  buckets.all = orders;
  for (const order of orders) {
    switch (order.order_status) {
      case 'pending':
        if (isPickup(order.is_pickup)) buckets.pendingPickup.push(order);
        else buckets.pendingDelivery.push(order);
        break;
      case 'accepted':
        buckets.accepted.push(order);
        break;
      case 'ready_for_pickup':
        buckets.readyForPickup.push(order);
        break;
      case 'out_for_delivery':
        buckets.outForDelivery.push(order);
        break;
      case 'delivered':
        buckets.delivered.push(order);
        break;
      case 'cancelled':
        buckets.cancelled.push(order);
        break;
      default:
        break;
    }
  }
  return buckets;
}

export function vendorLineTotal(item: OrderItem): number {
  return item.quantity * parsePrice(item.vendor_price);
}

export function vendorOrderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + vendorLineTotal(item), 0);
}

export function mapApiProduct(
  productId: string,
  categoryId: string,
  raw: Record<string, unknown>,
): Product {
  return {
    product_id: asString(raw.product_id) || productId,
    product_name: asString(raw.product_name),
    product_description: asString(raw.product_description),
    product_price: asNumber(raw.product_price),
    product_qty: asNumber(raw.product_qty),
    product_image: (raw.product_image as string | null | undefined) ?? null,
    product_status: asString(raw.product_status) || 'active',
    product_is_per_kg: asBool(raw.product_is_per_kg),
    category_id: asString(raw.category_id) || categoryId,
  };
}

export function mapApiCategories(
  raw: Record<string, Record<string, unknown>> | null | undefined,
): Category[] {
  if (!raw) return [];
  return Object.entries(raw).map(([catId, value]) => {
    const productsMap = (value.products as Record<string, Record<string, unknown>>) ?? {};
    const products = Object.entries(productsMap).map(([productId, product]) =>
      mapApiProduct(productId, catId, product),
    );
    return {
      cat_id: asString(value.cat_id) || catId,
      cat_name: asString(value.cat_name),
      products,
    };
  });
}

export function findCatalogPerPiece(
  productName: string,
  categories: Category[],
): boolean {
  const lower = productName.toLowerCase();
  for (const category of categories) {
    for (const product of category.products) {
      if (product.product_name.toLowerCase() === lower) {
        return !product.product_is_per_kg;
      }
    }
  }
  return false;
}

export function orderItemIsPerPiece(item: OrderItem, categories: Category[]): boolean {
  return isPerPieceProduct(item.product_name, findCatalogPerPiece(item.product_name, categories));
}

export const MAX_CATEGORIES = 5;

export function hasDuplicateCategoryName(
  name: string,
  categories: Category[],
  exceptId?: string,
): boolean {
  const needle = name.trim().toLowerCase();
  return categories.some(
    (c) => c.cat_id !== exceptId && c.cat_name.trim().toLowerCase() === needle,
  );
}
