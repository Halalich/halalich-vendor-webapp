import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorStore } from '../store/VendorStore';
import { OrderGroupCard } from '../components/OrderGroupCard';
import { groupOrders } from '../domain/combinedOrders';
import { OrderPanel } from '../components/OrderPanel';
import type { Order } from '../types';

function StatCard({
  label,
  value,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white p-5 text-left shadow-sm border border-slate-100 hover:border-brand/40"
    >
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
    </button>
  );
}

export function DashboardPage() {
  const { buckets, pendingOrders, orderCategories, vendorNames, refreshOrders, refreshing } = useVendorStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Order | null>(null);
  const deliveryGroups = useMemo(() => groupOrders(buckets.pendingDelivery), [buckets.pendingDelivery]);
  const pickupGroups = useMemo(() => groupOrders(buckets.pendingPickup), [buckets.pendingPickup]);
  const showVendor = Object.keys(vendorNames).length > 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-muted">Incoming orders and shop status</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOrders()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending"
          value={buckets.pendingPickup.length + buckets.pendingDelivery.length}
          tone="text-pending"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          label="Active"
          value={buckets.accepted.length}
          tone="text-ink"
          onClick={() => navigate('/orders?tab=active')}
        />
        <StatCard
          label="Ready for pickup"
          value={buckets.readyForPickup.length}
          tone="text-amber-600"
          onClick={() => navigate('/orders?tab=ready')}
        />
        <StatCard
          label="Delivered"
          value={buckets.delivered.length}
          tone="text-delivered"
          onClick={() => navigate('/orders?tab=completed')}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold text-ink">Delivery requests</h2>
          <div className="grid gap-3">
            {buckets.pendingDelivery.length === 0 && (
              <p className="rounded-2xl bg-white p-6 text-sm text-muted">No delivery requests</p>
            )}
            {deliveryGroups.map((group) => (
              <OrderGroupCard key={group.key} group={group} onSelect={setSelected} showVendor={showVendor} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-semibold text-ink">Pickup requests</h2>
          <div className="grid gap-3">
            {buckets.pendingPickup.length === 0 && (
              <p className="rounded-2xl bg-white p-6 text-sm text-muted">No pickup requests</p>
            )}
            {pickupGroups.map((group) => (
              <OrderGroupCard key={group.key} group={group} onSelect={setSelected} showVendor={showVendor} />
            ))}
          </div>
        </section>
      </div>

      {pendingOrders.length === 0 && (
        <p className="sr-only">No pending orders</p>
      )}

      {selected && (
        <OrderPanel
          order={selected}
          categories={orderCategories}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
