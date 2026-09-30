import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, getLinkedAuth } from '../firebase/config';
import { registerVendorAuth, unregisterVendorAuth } from '../api/client';

/** Another vendor account combined into this session from Profile settings. */
export interface LinkedAccount {
  vendorId: string;
  email: string;
  appName: string;
}

interface AuthContextValue {
  user: User | null;
  vendorId: string | null;
  linkedAccounts: LinkedAccount[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  linkVendor: (email: string, password: string) => Promise<void>;
  unlinkVendor: (vendorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LINKED_APPS_KEY = 'halalich-vendor-linked-apps';

/** Linked apps are stored with the primary vendor that owns them, so another vendor never inherits them. */
function loadAppNames(ownerUid: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LINKED_APPS_KEY) ?? 'null') as {
      owner?: unknown;
      apps?: unknown;
    } | null;
    if (!parsed || !Array.isArray(parsed.apps)) return [];
    const names = parsed.apps.filter((n): n is string => typeof n === 'string');
    return parsed.owner === ownerUid ? names : [];
  } catch {
    return [];
  }
}

function saveAppNames(ownerUid: string | null, names: string[]): void {
  try {
    if (!ownerUid || names.length === 0) localStorage.removeItem(LINKED_APPS_KEY);
    else localStorage.setItem(LINKED_APPS_KEY, JSON.stringify({ owner: ownerUid, apps: names }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const primaryUid = user?.uid ?? null;

  // Restore linked sessions (each persisted by its own Firebase app) once the primary is known.
  useEffect(() => {
    if (!primaryUid) {
      setLinkedAccounts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const restored: LinkedAccount[] = [];
      for (const appName of loadAppNames(primaryUid)) {
        const linkedAuth = getLinkedAuth(appName);
        await linkedAuth.authStateReady();
        const linkedUser = linkedAuth.currentUser;
        if (!linkedUser || linkedUser.uid === primaryUid) continue;
        registerVendorAuth(linkedUser.uid, linkedAuth);
        restored.push({ vendorId: linkedUser.uid, email: linkedUser.email ?? '', appName });
      }
      if (!cancelled) {
        saveAppNames(primaryUid, restored.map((a) => a.appName));
        setLinkedAccounts(restored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryUid]);

  const linkVendor = useCallback(
    async (email: string, password: string) => {
      const appName = `linked-${Date.now()}`;
      const linkedAuth = getLinkedAuth(appName);
      try {
        const { user: linkedUser } = await signInWithEmailAndPassword(
          linkedAuth,
          email.trim(),
          password,
        );
        if (linkedUser.uid === primaryUid) {
          throw new Error('This is the vendor you are already signed in with');
        }
        if (linkedAccounts.some((a) => a.vendorId === linkedUser.uid)) {
          throw new Error('This vendor is already added');
        }
        registerVendorAuth(linkedUser.uid, linkedAuth);
        const account: LinkedAccount = {
          vendorId: linkedUser.uid,
          email: linkedUser.email ?? email.trim(),
          appName,
        };
        saveAppNames(primaryUid, [...linkedAccounts.map((a) => a.appName), appName]);
        setLinkedAccounts((prev) => [...prev, account]);
      } catch (error) {
        await signOut(linkedAuth).catch(() => undefined);
        throw error;
      }
    },
    [primaryUid, linkedAccounts],
  );

  const unlinkVendor = useCallback(
    async (vendorId: string) => {
      const account = linkedAccounts.find((a) => a.vendorId === vendorId);
      if (!account) return;
      unregisterVendorAuth(vendorId);
      await signOut(getLinkedAuth(account.appName)).catch(() => undefined);
      const rest = linkedAccounts.filter((a) => a.vendorId !== vendorId);
      saveAppNames(primaryUid, rest.map((a) => a.appName));
      setLinkedAccounts(rest);
    },
    [linkedAccounts, primaryUid],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      vendorId: user?.uid ?? null,
      linkedAccounts,
      loading,
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      logout: async () => {
        // Signing out of the primary vendor also ends every linked session.
        await Promise.all(
          linkedAccounts.map(async (account) => {
            unregisterVendorAuth(account.vendorId);
            await signOut(getLinkedAuth(account.appName)).catch(() => undefined);
          }),
        );
        saveAppNames(null, []);
        await signOut(auth);
      },
      linkVendor,
      unlinkVendor,
    }),
    [user, loading, linkedAccounts, linkVendor, unlinkVendor],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
