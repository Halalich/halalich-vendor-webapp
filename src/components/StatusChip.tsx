const styles: Record<string, string> = {
  pending: 'bg-pending/10 text-pending',
  accepted: 'bg-blue-50 text-blue-700',
  ready_for_pickup: 'bg-amber-50 text-amber-700',
  out_for_delivery: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-delivered/10 text-delivered',
  cancelled: 'bg-danger/10 text-danger',
};

const labels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Active',
  ready_for_pickup: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
