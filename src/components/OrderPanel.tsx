import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Category, Order } from '../types';
import { formatEuro } from '../domain/price';
import { isPickup } from '../domain/text';
import { orderItemIsPerPiece, vendorLineTotal, vendorOrderTotal } from '../domain/orders';
import { quantityLabel, unitPriceLabel } from '../domain/orderItemDisplay';
import { printOrderReceipts } from '../print/receipts';
import { StatusChip } from './StatusChip';
import { useVendorStore } from '../store/VendorStore';

function addressLine(order: Order): string {
  const a = order.delivery_address;
  if (!a) return 'No address';
  return [a.street, a.zipcode, a.city, a.country].filter(Boolean).join(', ');
}

export function OrderPanel({
  order,
  categories,
  onClose,
}: {
  order: Order;
  categories: Category[];
  onClose: () => void;
}) {
  const { setOrderStatus } = useVendorStore();
  const [busy, setBusy] = useState<string | null>(null);
  const pickup = isPickup(order.is_pickup);

  async function run(status: string, label: string) {
    setBusy(label);
    try {
      await setOrderStatus(order.order_id, status);
      toast.success(`Order ${label.toLowerCase()}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  function print() {
    try {
      printOrderReceipts(order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Print failed');
    }
  }

  const actions: { label: string; status: string; danger?: boolean }[] = [];
  if (order.order_status === 'pending') {
    actions.push({ label: 'Accept', status: 'accepted' });
    actions.push({ label: 'Reject', status: 'cancelled', danger: true });
  } else if (order.order_status === 'accepted') {
    actions.push({ label: 'Mark ready', status: 'ready_for_pickup' });
  } else if (order.order_status === 'ready_for_pickup') {
    actions.push(
      pickup
        ? { label: 'Delivered', status: 'delivered' }
        : { label: 'Out for delivery', status: 'out_for_delivery' },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="flex-1 bg-ink/40" aria-label="Close" onClick={onClose} />
      <aside className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Order</p>
            <h2 className="text-xl font-semibold text-ink">#{order.order_id.slice(-8)}</h2>
          </div>
          <StatusChip status={order.order_status} />
        </div>
        <p className="mt-2 text-sm text-muted">{order.order_date}</p>
        <p className="mt-1 text-sm text-ink">
          {pickup ? 'Pickup' : 'Delivery'} · {addressLine(order)}
        </p>
        {order.delivery_address?.bell_name && (
          <p className="text-sm text-muted">Bell: {order.delivery_address.bell_name}</p>
        )}
        {order.scheduled_pickup_time && (
          <p className="text-sm text-muted">Scheduled: {order.scheduled_pickup_time}</p>
        )}

        <ul className="mt-6 divide-y divide-slate-100">
          {order.items.map((item, index) => {
            const perPiece = orderItemIsPerPiece(item, categories);
            return (
              <li key={`${item.product_name}-${index}`} className="py-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium text-ink">{item.product_name}</p>
                  <p className="font-semibold">{formatEuro(vendorLineTotal(item))}</p>
                </div>
                <p className="text-sm text-muted">
                  {quantityLabel(item.quantity, perPiece)} ·{' '}
                  {unitPriceLabel(item.vendor_price, perPiece)}
                </p>
                {item.instructions && (
                  <p className="mt-1 text-sm text-brand">Note: {item.instructions}</p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-between text-base font-semibold">
          <span>Vendor total</span>
          <span>{formatEuro(vendorOrderTotal(order))}</span>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={busy != null}
              onClick={() => void run(action.status, action.label)}
              className={`rounded-xl px-4 py-3 font-semibold disabled:opacity-60 ${
                action.danger
                  ? 'bg-danger text-white'
                  : 'bg-brand text-white hover:bg-brand/90'
              }`}
            >
              {busy === action.label ? 'Saving…' : action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={print}
            className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-ink hover:bg-page"
          >
            Print receipts
          </button>
          <button type="button" onClick={onClose} className="text-sm text-muted py-2">
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
