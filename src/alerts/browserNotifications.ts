export interface BrowserNotification {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function showBrowserNotification(
  notification: BrowserNotification,
): Promise<void> {
  if (!notificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const options: NotificationOptions & { renotify?: boolean } = {
    body: notification.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: notification.tag,
    renotify: true,
    requireInteraction: notification.requireInteraction ?? true,
    data: { url: notification.url ?? '/' },
  };

  try {
    const registration = await Promise.race([
      navigator.serviceWorker?.ready ?? Promise.resolve(undefined),
      new Promise<undefined>((resolve) => {
        window.setTimeout(() => resolve(undefined), 1500);
      }),
    ]);
    if (registration?.showNotification) {
      await registration.showNotification(notification.title, options);
      return;
    }
  } catch {
    /* fall through to Notification constructor */
  }

  const native = new Notification(notification.title, options);
  native.onclick = () => {
    window.focus();
    native.close();
    if (notification.url) {
      window.location.assign(notification.url);
    }
  };
}

export function newOrderNotificationCopy(itemCount: number, orderId: string): BrowserNotification {
  const count = Number.isFinite(itemCount) ? itemCount : 0;
  const formatted = String(count).replace(/\.0$/, '');
  return {
    title: 'New order received',
    body: `You have a new order (${formatted} items).`,
    tag: `order-${orderId}`,
    url: '/orders',
    requireInteraction: true,
  };
}
