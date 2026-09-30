import { formatEuro } from '../domain/price';
import { groupVendorTotal, type OrderGroup } from '../domain/combinedOrders';
import { vendorOrderTotal } from '../domain/orders';
import type { Order } from '../types';
import { OrderCard } from './OrderCard';
import { StatusChip } from './StatusChip';

function addressLine(order: Order): string {
  const a = order.delivery_address;
  if (!a) return '';
  return [a.street, a.zipcode, a.city].filter(Boolean).join(', ');
}

/** One card per delivery: combined across vendors when several vendors share it. */
export function OrderGroupCard({
  group,
  onSelect,
  showVendor,
}: {
  group: OrderGroup;
  onSelect: (order: Order) => void;
  showVendor: boolean;
}) {
  const [first] = group.orders;
  if (!first) return null;
  if (!group.combined) {
    return <OrderCard order={first} onClick={() => onSelect(first)} showVendor={showVendor} />;
  }

  const vendorCount = new Set(group.orders.map((o) => o.vendor_id)).size;
  return (
    <div className="rounded-2xl border border-brand/30 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Combined delivery · {vendorCount} vendors
          </p>
          <p className="mt-1 text-xs text-muted">{addressLine(first) || 'Same customer'}</p>
        </div>
        <span className="text-sm font-semibold text-brand">
          {formatEuro(groupVendorTotal(group.orders))}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-slate-100">
        {group.orders.map((order) => (
          <li key={`${order.vendor_id}:${order.order_id}`}>
            <button
              type="button"
              onClick={() => onSelect(order)}
              className="w-full py-2.5 text-left hover:bg-page"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                  {order.vendor_name || 'Vendor'}
                </span>
                <StatusChip status={order.order_status} />
              </div>
              <p className="mt-1.5 text-sm text-ink line-clamp-2">
                #{order.order_id.slice(-8)} ·{' '}
                {order.items.map((item) => item.product_name).join(', ') || 'No items'}
              </p>
              <p className="text-right text-sm font-semibold text-ink">
                {formatEuro(vendorOrderTotal(order))}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
