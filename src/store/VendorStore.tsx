import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import {
  createCategory,
  createProduct,
  fetchCategories,
  fetchOrdersForVendors,
  fetchVendor,
  toProductPayload,
  updateCategory,
  updateOrderStatus,
  updateProduct,
  updateVendor,
  type ProductWritePayload,
} from '../api/vendorApi';
import { bucketOrders } from '../domain/orders';
import type { Category, Order, OrderBuckets, Product, Vendor } from '../types';
import {
  notifyNewOrder,
  playOrderAlarm,
  startNewOrderAlerts,
  stopOrderAlarm,
} from '../alerts/newOrderAlerts';
import { startForegroundFcm } from '../alerts/fcm';

interface VendorStoreValue {
  vendor: Vendor | null;
  categories: Category[];
  /** Catalogs of the primary and all linked vendors, for order line display. */
  orderCategories: Category[];
  /** Display name per vendor id (primary and linked). */
  vendorNames: Record<string, string>;
  buckets: OrderBuckets;
  pendingOrders: Order[];
  bootLoading: boolean;
  refreshing: boolean;
  boot: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  setOrderStatus: (orderId: string, status: string, vendorId?: string) => Promise<void>;
  saveVendor: (vendor: Vendor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  renameCategory: (categoryId: string, name: string) => Promise<void>;
  addProduct: (categoryId: string, product: ProductWritePayload) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  silenceAlarm: () => void;
}

const VendorStoreContext = createContext<VendorStoreValue | undefined>(undefined);

export function VendorStoreProvider({ children }: { children: ReactNode }) {
  const { vendorId, linkedAccounts } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [linkedData, setLinkedData] = useState<
    Record<string, { vendor: Vendor | null; categories: Category[] }>
  >({});
  const [bootLoading, setBootLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const linkedIds = useMemo(() => linkedAccounts.map((a) => a.vendorId), [linkedAccounts]);
  const allVendorIds = useMemo(
    () => (vendorId ? [vendorId, ...linkedIds] : []),
    [vendorId, linkedIds],
  );
  const allVendorKey = allVendorIds.join(',');
  // Read by boot so linking a vendor doesn't re-run it (and flash the loader).
  const allVendorIdsRef = useRef(allVendorIds);
  allVendorIdsRef.current = allVendorIds;

  const vendorNames = useMemo(() => {
    const names: Record<string, string> = {};
    if (vendorId) names[vendorId] = vendor?.vendor_name || 'Your shop';
    for (const account of linkedAccounts) {
      names[account.vendorId] = linkedData[account.vendorId]?.vendor?.vendor_name || account.email;
    }
    return names;
  }, [vendorId, vendor, linkedAccounts, linkedData]);

  const labelledOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        vendor_name: (order.vendor_id && vendorNames[order.vendor_id]) || order.vendor_name,
      })),
    [orders, vendorNames],
  );

  const orderCategories = useMemo(
    () => [...categories, ...Object.values(linkedData).flatMap((d) => d.categories)],
    [categories, linkedData],
  );

  const buckets = useMemo(() => bucketOrders(labelledOrders), [labelledOrders]);
  const pendingOrders = useMemo(
    () => [...buckets.pendingPickup, ...buckets.pendingDelivery],
    [buckets],
  );

  const refreshOrders = useCallback(async () => {
    if (!vendorId) return;
    setRefreshing(true);
    try {
      setOrders(await fetchOrdersForVendors(allVendorIds));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  }, [vendorId, allVendorIds]);

  const boot = useCallback(async () => {
    if (!vendorId) return;
    setBootLoading(true);
    try {
      const nextVendor = await fetchVendor(vendorId);
      setVendor(nextVendor);
      const nextCategories = await fetchCategories(vendorId);
      setCategories(nextCategories);
      const nextOrders = await fetchOrdersForVendors(allVendorIdsRef.current);
      setOrders(nextOrders);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load vendor data');
    } finally {
      setBootLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Load profile and catalog of linked vendors (names label orders, catalogs decide per-piece display).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        linkedIds.map(async (id) => {
          const [v, c] = await Promise.allSettled([fetchVendor(id), fetchCategories(id)]);
          return [
            id,
            {
              vendor: v.status === 'fulfilled' ? v.value : null,
              categories: c.status === 'fulfilled' ? c.value : [],
            },
          ] as const;
        }),
      );
      if (!cancelled) setLinkedData(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedIds]);

  // Pick up orders of a newly linked (or unlinked) vendor right away.
  const fetchedKey = useRef(allVendorKey);
  useEffect(() => {
    if (!vendorId || bootLoading || fetchedKey.current === allVendorKey) return;
    fetchedKey.current = allVendorKey;
    void fetchOrdersForVendors(allVendorIds)
      .then(setOrders)
      .catch(() => undefined);
  }, [vendorId, bootLoading, allVendorKey, allVendorIds]);

  useEffect(() => {
    if (!vendorId || bootLoading) return;
    const stop = startNewOrderAlerts({
      vendorIds: allVendorIds,
      onNewPending: (alert) => {
        void playOrderAlarm();
        void notifyNewOrder(alert.orderId, alert.itemCount);
        toast.success('New order received');
      },
      applyOrders: (next) => {
        setOrders(next);
      },
    });
    let stopFcm: () => void = () => undefined;
    let fcmCancelled = false;
    void startForegroundFcm(vendorId).then((unsub) => {
      if (fcmCancelled) unsub();
      else stopFcm = unsub;
    });
    const onFocus = () => stopOrderAlarm();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') stopOrderAlarm();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      fcmCancelled = true;
      stop();
      stopFcm();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      stopOrderAlarm();
    };
  }, [vendorId, bootLoading, allVendorIds]);

  const setOrderStatus = useCallback(
    async (orderId: string, status: string, orderVendorId?: string) => {
      await updateOrderStatus(orderId, status, orderVendorId);
      if (status !== 'pending') stopOrderAlarm();
      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId && (!orderVendorId || order.vendor_id === orderVendorId)
            ? { ...order, order_status: status }
            : order,
        ),
      );
    },
    [],
  );

  const saveVendor = useCallback(
    async (next: Vendor) => {
      if (!vendorId) return;
      await updateVendor(vendorId, next);
      setVendor(next);
    },
    [vendorId],
  );

  const reloadCatalog = useCallback(async () => {
    if (!vendorId) return;
    setCategories(await fetchCategories(vendorId));
  }, [vendorId]);

  const addCategory = useCallback(
    async (name: string) => {
      if (!vendorId) return;
      await createCategory(vendorId, name);
      await reloadCatalog();
    },
    [reloadCatalog, vendorId],
  );

  const renameCategory = useCallback(
    async (categoryId: string, name: string) => {
      if (!vendorId) return;
      await updateCategory(vendorId, categoryId, name);
      await reloadCatalog();
    },
    [reloadCatalog, vendorId],
  );

  const addProduct = useCallback(
    async (categoryId: string, product: ProductWritePayload) => {
      if (!vendorId) return;
      await createProduct(vendorId, categoryId, product);
      await reloadCatalog();
    },
    [reloadCatalog, vendorId],
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      if (!vendorId) return;
      await updateProduct(vendorId, product.category_id, product.product_id, toProductPayload(product));
      await reloadCatalog();
    },
    [reloadCatalog, vendorId],
  );

  const value = useMemo<VendorStoreValue>(
    () => ({
      vendor,
      categories,
      orderCategories,
      vendorNames,
      buckets,
      pendingOrders,
      bootLoading,
      refreshing,
      boot,
      refreshOrders,
      setOrderStatus,
      saveVendor,
      addCategory,
      renameCategory,
      addProduct,
      saveProduct,
      silenceAlarm: stopOrderAlarm,
    }),
    [
      vendor,
      categories,
      orderCategories,
      vendorNames,
      buckets,
      pendingOrders,
      bootLoading,
      refreshing,
      boot,
      refreshOrders,
      setOrderStatus,
      saveVendor,
      addCategory,
      renameCategory,
      addProduct,
      saveProduct,
    ],
  );

  return <VendorStoreContext.Provider value={value}>{children}</VendorStoreContext.Provider>;
}

export function useVendorStore(): VendorStoreValue {
  const ctx = useContext(VendorStoreContext);
  if (!ctx) throw new Error('useVendorStore must be used within VendorStoreProvider');
  return ctx;
}
