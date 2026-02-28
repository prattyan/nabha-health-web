/* eslint-disable no-undef */
/**
 * Firebase Messaging Service Worker
 * Handles background notifications when the app is not in focus or closed.
 * It initializes the Firebase app (compat version) and listens for background messages.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const urlParams = new URL(location).searchParams;

// We pass the config via URL parameters during Service Worker registration.
// This prevents hardcoding and accidental exposure of real keys in source control.
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId')
};

// Only initialize if we received valid configuration
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);

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
}
