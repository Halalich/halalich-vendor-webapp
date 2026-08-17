import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVendorStore } from '../store/VendorStore';
import { OrderCard } from '../components/OrderCard';
import { OrderPanel } from '../components/OrderPanel';
import type { Order } from '../types';

const tabs = [
  { id: 'active', label: 'Active' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
] as const;

export function OrdersPage() {
  const { buckets, categories, refreshOrders, refreshing } = useVendorStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'ready' || params.get('tab') === 'completed' ? params.get('tab') : 'active';
  const [selected, setSelected] = useState<Order | null>(null);

  const list = useMemo(() => {
    if (tab === 'ready') return buckets.readyForPickup;
    if (tab === 'completed') return buckets.delivered;
    return buckets.accepted;
  }, [buckets, tab]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Orders</h1>
          <p className="text-sm text-muted">Active, ready and completed</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOrders()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="mt-6 flex gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setParams({ tab: item.id })}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === item.id ? 'bg-brand text-white' : 'bg-white text-ink border border-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.length === 0 && (
          <p className="col-span-full rounded-2xl bg-white p-6 text-sm text-muted">No orders in this tab</p>
        )}
        {list.map((order) => (
          <OrderCard key={order.order_id} order={order} onClick={() => setSelected(order)} />
        ))}
      </div>
      {selected && (
        <OrderPanel order={selected} categories={categories} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
