import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { useVendorStore } from '../store/VendorStore';

/** Settings section to sign in to more vendor accounts and see their orders combined. */
export function LinkedVendors() {
  const { linkedAccounts, linkVendor, unlinkVendor } = useAuth();
  const { vendorNames } = useVendorStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }
    setBusy(true);
    try {
      await linkVendor(email, password);
      setEmail('');
      setPassword('');
      toast.success('Vendor added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add vendor');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(vendorId: string) {
    try {
      await unlinkVendor(vendorId);
      toast.success('Vendor removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove vendor');
    }
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Combined vendors</h2>
      <p className="text-sm text-muted">
        Sign in to another vendor to see its orders here. Orders from the same customer to the
        same delivery are shown together, labelled by vendor.
      </p>
      {linkedAccounts.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {linkedAccounts.map((account) => (
            <li key={account.vendorId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {vendorNames[account.vendorId] ?? account.email}
                </p>
                <p className="truncate text-sm text-muted">{account.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void onRemove(account.vendorId)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Vendor email
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add vendor'}
          </button>
        </div>
      </form>
    </section>
  );
}
