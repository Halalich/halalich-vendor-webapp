import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { watchCrashes } from './api/errorReport';

watchCrashes();

async function registerNotificationWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/notification-sw.js');
  } catch (error) {
    console.warn('Notification service worker failed to register', error);
  }
}

void registerNotificationWorker().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
