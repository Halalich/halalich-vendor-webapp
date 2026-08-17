import { equalTo, onChildAdded, orderByChild, query, ref, get } from 'firebase/database';
import { database } from '../firebase/config';

const REFRESH_DELAYS_MS = [0, 3000, 8000, 15000, 25000];
const ALARM_MS = 30_000;

export interface NewOrderAlert {
  orderId: string;
  status: string;
}

export function startNewOrderAlerts(options: {
  vendorId: string;
  onNewPending: (alert: NewOrderAlert) => void;
  onRefreshPulse: () => void;
}): () => void {
  const seen = new Set<string>();
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
      return;
    }
    if (seen.has(orderId)) return;
    seen.add(orderId);
    const status = String(snap.child('order_status').val() ?? '');
    if (status === 'pending') {
      options.onNewPending({ orderId, status });
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
let alarmNodes: { osc: OscillatorNode; gain: GainNode; stopAt: number } | null = null;
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
  const stopAt = ctx.currentTime + ALARM_MS / 1000;
  alarmNodes = { osc, gain, stopAt };
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

export async function notifyNewOrder(orderId: string): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    new Notification('New Halalich order', {
      body: `Pending order ${orderId}`,
      tag: `order-${orderId}`,
    });
  }
}
