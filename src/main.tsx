import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerNotificationServiceWorker, subscribeToForegroundMessages } from './services/notificationService';

/**
 * Application Entry Point
 * Initializes the React application, global styles, and notification services.
 */

// Initialize notification service worker for background handling
registerNotificationServiceWorker();

/**
 * Handles incoming foreground notification messages.
 * Displays a local browser notification if permission is granted.
 * @param payload - The notification payload containing title, body, and icon.
 */
const handleForegroundMessage = (payload: any) => {
  if (Notification.permission !== 'granted') return;

  const title = payload.notification?.title ?? 'New Notification';
  const options = {
    body: payload.notification?.body ?? 'You have a new update.',
    icon: payload.notification?.icon
  };

  new Notification(title, options);
};

// Subscribe to foreground messages to show local notifications
subscribeToForegroundMessages(handleForegroundMessage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
