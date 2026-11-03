import { fetchOrdersForVendors } from '../api/vendorApi';
import type { Order } from '../types';
import { newOrderNotificationCopy, showBrowserNotification } from './browserNotifications';

const POLL_INTERVAL_MS = 10_000;
const ALARM_MS = 30_000;
const SEEN_STORAGE_KEY = 'halalich-vendor-alerted-orders';

export interface NewOrderAlert {
  orderId: string;
  status: string;
  itemCount: number;
}

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeen(seen: Set<string>): void {
  try {
    sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore quota / private mode */
  }
}

function itemCountFromOrder(order: Pick<Order, 'items'>): number {
  return order.items.reduce((sum, item) => {
    const qty = Number(item?.quantity ?? 0);
    return sum + (Number.isFinite(qty) ? qty : 0);
  }, 0);
}

/** First successful poll only records IDs. Later polls emit alerts for new pending orders. */
export function collectNewPendingAlerts(
  orders: Order[],
  seen: Set<string>,
  seeded: boolean,
): { alerts: NewOrderAlert[]; seeded: boolean } {
  if (!seeded) {
    for (const order of orders) {
      if (order.order_id) seen.add(order.order_id);
    }
    return { alerts: [], seeded: true };
  }

  const alerts: NewOrderAlert[] = [];
  for (const order of orders) {
    if (!order.order_id || seen.has(order.order_id)) continue;
    seen.add(order.order_id);
    if (order.order_status === 'pending') {
      alerts.push({
        orderId: order.order_id,
        status: order.order_status,
        itemCount: itemCountFromOrder(order),
      });
    }
  }
  return { alerts, seeded: true };
}

export function startNewOrderAlerts(options: {
  vendorIds: string[];
  onNewPending: (alert: NewOrderAlert) => void;
  applyOrders: (orders: Order[]) => void;
}): () => void {
  const seen = loadSeen();
  let seeded = false;
  let cancelled = false;
  let inFlight = false;

  const poll = async () => {
    if (cancelled || inFlight) return;
    inFlight = true;
    try {
      const orders = await fetchOrdersForVendors(options.vendorIds);
      if (cancelled) return;
      options.applyOrders(orders);
      const result = collectNewPendingAlerts(orders, seen, seeded);
      seeded = result.seeded;
      persistSeen(seen);
      for (const alert of result.alerts) {
        options.onNewPending(alert);
      }
    } catch {
      /* retry on the next interval */
    } finally {
      inFlight = false;
    }
  };

  void poll();
  const intervalId = window.setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

let audioCtx: AudioContext | null = null;
let alarmNodes: { osc: OscillatorNode; gain: GainNode } | null = null;
let alarmTimer: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export async function playOrderAlarm(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  stopOrderAlarm();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  alarmNodes = { osc, gain };
  alarmTimer = window.setTimeout(() => stopOrderAlarm(), ALARM_MS);
}

export function stopOrderAlarm(): void {
  if (alarmTimer != null) {
    window.clearTimeout(alarmTimer);
    alarmTimer = null;
  }
  if (alarmNodes) {
    try {
      alarmNodes.osc.stop();
    } catch {
      /* already stopped */
    }
    alarmNodes.osc.disconnect();
    alarmNodes.gain.disconnect();
    alarmNodes = null;
  }
}

export async function notifyNewOrder(orderId: string, itemCount = 0): Promise<void> {
  await showBrowserNotification(newOrderNotificationCopy(itemCount, orderId));
}
