import { formatEuro } from '../domain/price';
import { isPickup } from '../domain/text';
import { vendorOrderTotal } from '../domain/orders';
import type { Order } from '../types';
import { StatusChip } from './StatusChip';

export function OrderCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const pickup = isPickup(order.is_pickup);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:border-brand/40 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">#{order.order_id.slice(-8)}</p>
          <p className="mt-1 text-xs text-muted">{order.order_date}</p>
        </div>
        <StatusChip status={order.order_status} />
      </div>
      <p className="mt-3 text-sm text-ink line-clamp-2">
        {order.items.map((item) => item.product_name).join(', ') || 'No items'}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">{pickup ? 'Pickup' : 'Delivery'}</span>
        <span className="font-semibold text-brand">{formatEuro(vendorOrderTotal(order))}</span>
      </div>
    </button>
  );
}
