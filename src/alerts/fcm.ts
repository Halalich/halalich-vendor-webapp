import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { updateVendorWebFcmToken } from '../api/vendorApi';
import { firebaseApp } from '../firebase/config';
import { showBrowserNotification } from './browserNotifications';

let messaging: Messaging | null = null;

export async function startForegroundFcm(vendorId: string): Promise<() => void> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return () => undefined;

  const supported = await isSupported().catch(() => false);
  if (!supported) return () => undefined;

  messaging = getMessaging(firebaseApp);
  const registration = await navigator.serviceWorker.ready.catch(() => undefined);

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await updateVendorWebFcmToken(vendorId, token);
    }
  } catch (error) {
    console.warn('Web FCM token registration failed', error);
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title || 'Halalich';
    const body = payload.notification?.body || payload.data?.body || 'You have a new notification.';
    void showBrowserNotification({
      title,
      body,
      tag: payload.messageId || `fcm-${Date.now()}`,
      url: '/orders',
      requireInteraction: true,
    });
  });

  return unsubscribe;
}
