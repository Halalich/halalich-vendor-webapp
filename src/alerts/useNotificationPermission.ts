import { useCallback, useEffect, useState } from 'react';
import {
  ensureNotificationPermission,
  getNotificationPermission,
  notificationSupported,
} from '../alerts/browserNotifications';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission,
  );

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const request = useCallback(async () => {
    const next = await ensureNotificationPermission();
    setPermission(next);
    return next;
  }, []);

  return {
    supported: notificationSupported(),
    permission,
    enabled: permission === 'granted',
    request,
  };
}
