/* eslint-disable no-undef */
/**
 * Firebase Messaging Service Worker
 * Handles background notifications when the app is not in focus or closed.
 * It initializes the Firebase app (compat version) and listens for background messages.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// NOTE: Replace the config values below with your own Firebase project settings.
// This file is in /public and is not processed by Vite, so import.meta.env is not available.
// Copy the "Firebase SDK snippet" (config only) from your Firebase Console and paste it here locally.
firebase.initializeApp({
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID'
});

const messaging = firebase.messaging();

/**
 * Handles background messages received while the app is not active.
 * Displays a system notification using the Service Worker registration.
 * @param {Object} payload - The message payload from FCM.
 */
const handleBackgroundMessage = (payload) => {
  const title = payload.notification?.title || 'New Notification';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: payload.notification?.icon
  };

  self.registration.showNotification(title, options);
};

messaging.onBackgroundMessage(handleBackgroundMessage);
