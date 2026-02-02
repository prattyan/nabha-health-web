import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerNotificationServiceWorker, subscribeToForegroundMessages } from './services/notificationService';

registerNotificationServiceWorker();

subscribeToForegroundMessages((payload) => {
  if (Notification.permission !== 'granted') return;

  const title = payload.notification?.title ?? 'New Notification';
  const options = {
    body: payload.notification?.body ?? 'You have a new update.',
    icon: payload.notification?.icon
  };

  new Notification(title, options);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
