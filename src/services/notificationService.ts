import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  type Messaging,
  type MessagePayload
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const isFirebaseConfigured = () => {
  return Object.values(firebaseConfig).every((value) => Boolean(value));
};

const getTokenStorageKey = (userId?: string) => {
  return `fcmToken:${userId ?? 'default'}`;
};

/**
 * Retrieves the stored FCM token for the given user from local storage.
 * @param userId - The ID of the user (optional). If not provided, 'default' is used.
 * @returns The stored FCM token string, or null if not found.
 */
export const getStoredFcmToken = (userId?: string) => {
  return localStorage.getItem(getTokenStorageKey(userId));
};

/**
 * Initializes the Firebase Messaging instance if the configuration is present.
 * This function also initializes the Firebase app if it hasn't been done yet.
 * @returns The Firebase Messaging instance, or null if configuration is missing.
 */
export const initializeFirebaseMessaging = () => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase config is missing. Set VITE_FIREBASE_* environment variables.');
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }

  return messaging;
};

/**
 * Registers the Firebase Messaging service worker.
 * Checks if the browser supports service workers before attempting registration.
 * Allows passing dynamic Firebase config to prevent accidental exposure of real keys.
 * @returns A promise that resolves to the ServiceWorkerRegistration, or null if unsupported.
 */
export const registerNotificationServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const params = new URLSearchParams();
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) params.append(key, value as string);
  });

  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
};

/**
 * Requests notification permission from the user's browser.
 * @returns A promise that resolves to the NotificationPermission string ('granted', 'denied', or 'default').
 * Returns 'unsupported' if the browser does not support notifications.
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Enables push notifications for the user.
 * Requests permission, initializes messaging, registers service worker, and retrieves the FCM token.
 * The token is then stored in local storage for the specified user.
 * @param userId - The ID of the user (optional).
 * @returns An object containing the permission status and the FCM token (if successful).
 */
export const enablePushNotifications = async (userId?: string) => {
  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    return { permission, token: null };
  }

  const messagingInstance = initializeFirebaseMessaging();
  if (!messagingInstance) {
    return { permission, token: null };
  }

  const serviceWorkerRegistration = await registerNotificationServiceWorker();

  const token = await getToken(messagingInstance, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: serviceWorkerRegistration ?? undefined
  });

  if (token) {
    localStorage.setItem(getTokenStorageKey(userId), token);
    
    // Subscribe to foreground messages when push notifications are enabled
    subscribeToForegroundMessages();
  }

  return { permission, token };
};

/**
 * Disables push notifications for the user by deleting the FCM token
 * and removing it from local storage.
 * @param userId - The ID of the user (optional).
 */
export const disablePushNotifications = async (userId?: string) => {
  const messagingInstance = initializeFirebaseMessaging();
  if (messagingInstance) {
    try {
      await deleteToken(messagingInstance);
    } catch (error) {
      console.error('Failed to delete FCM token:', error);
    }
  }
  
  localStorage.removeItem(getTokenStorageKey(userId));
  
  if (foregroundSubscription) {
    foregroundSubscription();
    foregroundSubscription = null;
  }
};

export type NotificationType =
  | 'appointmentReminder'
  | 'doctorAvailability'
  | 'urgentTriageAlert'
  | 'prescriptionReady';

const notificationTemplates: Record<NotificationType, { title: string; body: string }> = {
  appointmentReminder: {
    title: 'Appointment Reminder',
    body: 'Your appointment is scheduled soon. Please be ready to join.'
  },
  doctorAvailability: {
    title: 'Doctor Available',
    body: 'A doctor is now available for consultation.'
  },
  urgentTriageAlert: {
    title: 'Urgent Triage Alert',
    body: 'A high-priority triage case needs immediate attention.'
  },
  prescriptionReady: {
    title: 'Prescription Ready',
    body: 'Your prescription is ready for pickup or review.'
  }
};

/**
 * Triggers a local browser notification.
 * Checks for permission and requests it if not already granted/denied.
 * @param type - The type of notification to display (uses predefined templates).
 * @param overrides - Optional overrides for the title, body, and icon.
 * @returns True if the notification was shown, false otherwise.
 */
export const showLocalNotification = async (
  type: NotificationType,
  overrides?: Partial<{ title: string; body: string; icon: string }>
) => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const template = notificationTemplates[type];
  const title = overrides?.title ?? template.title;
  const body = overrides?.body ?? template.body;
  const icon = overrides?.icon;

  new Notification(title, { body, icon });
  return true;
};

/**
 * Handles incoming foreground notification messages.
 * Displays a local browser notification if permission is granted.
 * @param payload - The notification payload containing title, body, and icon.
 */
const handleForegroundMessage = (payload: MessagePayload) => {
  if (Notification.permission !== 'granted') return;

  const title = payload.notification?.title ?? 'New Notification';
  const options = {
    body: payload.notification?.body ?? 'You have a new update.',
    icon: payload.notification?.icon
  };

  new Notification(title, options);
};

let foregroundSubscription: (() => void) | null = null;

/**
 * Subscribes to foreground message events from Firebase Cloud Messaging.
 * Uses a default handler to display local notifications if not provided.
 * Ensures only one active subscription exists.
 * @param handler - A callback function to handle the incoming message payload.
 * @returns An unsubscribe function, or undefined if messaging is not initialized.
 */
export const subscribeToForegroundMessages = (handler: (payload: MessagePayload) => void = handleForegroundMessage) => {
  const messagingInstance = initializeFirebaseMessaging();

  if (!messagingInstance) {
    return () => undefined;
  }

  if (foregroundSubscription) {
    foregroundSubscription();
  }

  foregroundSubscription = onMessage(messagingInstance, handler);
  return foregroundSubscription;
};

export const clearAllFcmTokens = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('fcmToken:')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};
