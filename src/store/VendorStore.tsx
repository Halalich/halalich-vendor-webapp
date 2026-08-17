import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import {
  createCategory,
  createProduct,
  fetchCategories,
  fetchOrders,
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
  buckets: OrderBuckets;
  pendingOrders: Order[];
  bootLoading: boolean;
  refreshing: boolean;
  boot: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  setOrderStatus: (orderId: string, status: string) => Promise<void>;
  saveVendor: (vendor: Vendor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  renameCategory: (categoryId: string, name: string) => Promise<void>;
  addProduct: (categoryId: string, product: ProductWritePayload) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  silenceAlarm: () => void;
}

const VendorStoreContext = createContext<VendorStoreValue | undefined>(undefined);

export function VendorStoreProvider({ children }: { children: ReactNode }) {
  const { vendorId } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buckets = useMemo(() => bucketOrders(orders), [orders]);
  const pendingOrders = useMemo(
    () => [...buckets.pendingPickup, ...buckets.pendingDelivery],
    [buckets],
  );

  const refreshOrders = useCallback(async () => {
    if (!vendorId) return;
    setRefreshing(true);
    try {
      const next = await fetchOrders(vendorId);
      setOrders(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  }, [vendorId]);

  const boot = useCallback(async () => {
    if (!vendorId) return;
    setBootLoading(true);
    try {
      const nextVendor = await fetchVendor(vendorId);
      setVendor(nextVendor);
      const nextCategories = await fetchCategories(vendorId);
      setCategories(nextCategories);
      const nextOrders = await fetchOrders(vendorId);
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

  useEffect(() => {
    if (!vendorId || bootLoading) return;
    const stop = startNewOrderAlerts({
      vendorId,
      onNewPending: (alert) => {
        void playOrderAlarm();
        void notifyNewOrder(alert.orderId, alert.itemCount);
        toast.success('New order received');
      },
      onRefreshPulse: () => {
        void refreshOrders();
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
  }, [vendorId, bootLoading, refreshOrders]);

  const setOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      await updateOrderStatus(orderId, status);
      if (status !== 'pending') stopOrderAlarm();
      setOrders((prev) =>
        prev.map((order) => (order.order_id === orderId ? { ...order, order_status: status } : order)),
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
