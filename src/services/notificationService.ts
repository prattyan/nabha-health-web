import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
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

export const getStoredFcmToken = (userId?: string) => {
  return localStorage.getItem(getTokenStorageKey(userId));
};

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

export const registerNotificationServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

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
  }

  return { permission, token };
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

export const subscribeToForegroundMessages = (handler: (payload: MessagePayload) => void) => {
  const messagingInstance = initializeFirebaseMessaging();

  if (!messagingInstance) {
    return () => undefined;
  }

  return onMessage(messagingInstance, handler);
};
