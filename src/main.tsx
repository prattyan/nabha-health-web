import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

import { StorageService } from './services/storageService';

const initApp = async () => {
  try {
    // Initialize Offline DB before rendering to ensure Sync/Cache is ready
    await StorageService.getInstance().init();
  } catch (e) {
    console.error("Failed to initialize storage service:", e);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
};

initApp();
