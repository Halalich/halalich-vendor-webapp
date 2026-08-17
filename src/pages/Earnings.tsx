import { useMemo } from 'react';
import { calculateEarnings } from '../domain/earnings';
import { formatEuro } from '../domain/price';
import { useVendorStore } from '../store/VendorStore';

export function EarningsPage() {
  const { buckets, refreshOrders, refreshing } = useVendorStore();
  const summary = useMemo(() => calculateEarnings(buckets.delivered), [buckets.delivered]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Earnings</h1>
          <p className="text-sm text-muted">Delivered orders only · vendor cut</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOrders()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">This month</p>
          <p className="mt-2 text-3xl font-semibold text-brand">
            {formatEuro(summary.thisMonthEarnings)}
          </p>
          <p className="mt-1 text-sm text-muted">{summary.thisMonthOrders} orders</p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">Last month</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {formatEuro(summary.lastMonthEarnings)}
          </p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">Total</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{formatEuro(summary.totalEarnings)}</p>
          <p className="mt-1 text-sm text-muted">{summary.totalOrders} delivered orders</p>
        </article>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">Growth vs last month</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.earningsGrowthPercent.toFixed(1)}%
          </p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">This month share of earnings</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.thisMonthShareOfTotalEarningsPercent.toFixed(1)}%
          </p>
        </article>
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-muted">This month share of orders</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.thisMonthShareOfTotalOrdersPercent.toFixed(1)}%
          </p>
        </article>
      </div>
    </div>
  );
}
