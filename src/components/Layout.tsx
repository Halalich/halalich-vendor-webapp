import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useVendorStore } from '../store/VendorStore';
import { useNotificationPermission } from '../alerts/useNotificationPermission';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  { to: '/earnings', label: 'Earnings' },
  { to: '/profile', label: 'Profile' },
];

export function Layout() {
  const { logout } = useAuth();
  const { vendor, bootLoading, silenceAlarm } = useVendorStore();
  const notifications = useNotificationPermission();
  const [open, setOpen] = useState(false);

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
          <p className="mt-4 text-muted">Loading your shop…</p>
        </div>
      </div>
    );
  }

  const showEnableBanner =
    notifications.supported && notifications.permission !== 'granted';

  return (
    <div className="min-h-screen bg-page flex" onClick={silenceAlarm}>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-ink text-white flex flex-col transform transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Halalich</p>
          <h1 className="mt-1 text-lg font-semibold">Vendor</h1>
          <p className="mt-2 text-sm text-white/70 truncate">
            {vendor?.vendor_name || 'Your shop'}
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-brand text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void logout()}
          className="m-4 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Log out
        </button>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            type="button"
            className="lg:hidden rounded-md border border-slate-200 px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <span className="font-semibold text-ink lg:hidden">Halalich Vendor</span>
          <div className="ml-auto flex items-center gap-3">
            {notifications.enabled ? (
              <span className="text-xs font-medium text-brand">Browser notifications on</span>
            ) : showEnableBanner ? (
              <button
                type="button"
                onClick={() => void notifications.request()}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white"
              >
                Enable browser notifications
              </button>
            ) : null}
          </div>
        </header>
        {showEnableBanner && notifications.permission === 'denied' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
            Notifications are blocked in this browser. Allow them in site settings to get new-order
            alerts.
          </div>
        )}
        {showEnableBanner && notifications.permission === 'default' && (
          <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 text-sm text-ink">
            Allow browser notifications so new orders pop up even when this tab is in the background.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
