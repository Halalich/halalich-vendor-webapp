import { equalTo, onChildAdded, orderByChild, query, ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { newOrderNotificationCopy, showBrowserNotification } from './browserNotifications';

const REFRESH_DELAYS_MS = [0, 3000, 8000, 15000, 25000];
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

function itemCountFromSnapshot(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value as Record<string, { quantity?: unknown }>).reduce((sum, item) => {
    const qty = Number(item?.quantity ?? 0);
    return sum + (Number.isFinite(qty) ? qty : 0);
  }, 0);
}

export function startNewOrderAlerts(options: {
  vendorId: string;
  onNewPending: (alert: NewOrderAlert) => void;
  onRefreshPulse: () => void;
}): () => void {
  const seen = loadSeen();
  let seeded = false;
  let cancelled = false;
  const timeouts: number[] = [];
  const ordersQuery = query(
    ref(database, 'orders'),
    orderByChild('vendor_id'),
    equalTo(options.vendorId),
  );

  const scheduleRefresh = () => {
    for (const delay of REFRESH_DELAYS_MS) {
      timeouts.push(
        window.setTimeout(() => {
          if (!cancelled) options.onRefreshPulse();
        }, delay),
      );
    }
  };

  void get(ordersQuery)
    .then((snap) => {
      if (cancelled) return;
      snap.forEach((child) => {
        if (child.key) seen.add(child.key);
      });
      persistSeen(seen);
      seeded = true;
    })
    .catch(() => {
      seeded = true;
    });

  const unsubscribe = onChildAdded(ordersQuery, (snap) => {
    const orderId = snap.key;
    if (!orderId) return;
    if (!seeded) {
      seen.add(orderId);
      persistSeen(seen);
      return;
    }
    if (seen.has(orderId)) return;
    seen.add(orderId);
    persistSeen(seen);
    const status = String(snap.child('order_status').val() ?? '');
    if (status === 'pending') {
      const itemCount = itemCountFromSnapshot(snap.child('items').val());
      options.onNewPending({ orderId, status, itemCount });
      scheduleRefresh();
    }
  });

  return () => {
    cancelled = true;
    unsubscribe();
    timeouts.forEach((id) => window.clearTimeout(id));
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
