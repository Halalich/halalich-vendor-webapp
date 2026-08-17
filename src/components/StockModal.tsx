import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Product } from '../types';
import { decrement, hasChanged, increment, parseQty } from '../domain/stock';
import { useVendorStore } from '../store/VendorStore';

export function StockModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { saveProduct } = useVendorStore();
  const [qty, setQty] = useState(String(product.product_qty));
  const [busy, setBusy] = useState(false);
  const parsed = parseQty(qty, product.product_qty);
  const changed = hasChanged(qty, product.product_qty);
  const belowZero = parsed < 0;

  async function save() {
    if (belowZero) {
      toast.error('Stock cannot go below 0');
      return;
    }
    if (!changed) {
      toast.error('Stock is unchanged');
      return;
    }
    setBusy(true);
    try {
      await saveProduct({ ...product, product_qty: Math.max(0, parsed) });
      toast.success('Stock updated');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Stock update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Update stock</h2>
        <p className="mt-1 text-sm text-muted">{product.product_name}</p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-slate-200 text-xl"
            onClick={() => setQty(String(decrement(parsed)))}
          >
            −
          </button>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-lg"
          />
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-slate-200 text-xl"
            onClick={() => setQty(String(increment(parsed)))}
          >
            +
          </button>
        </div>
        {belowZero && <p className="mt-2 text-sm text-danger">Cannot go below 0</p>}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex-1 rounded-xl bg-brand py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
