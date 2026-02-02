/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// NOTE: Replace the config values below with your Firebase project settings.
// This file is in /public and is not processed by Vite, so import.meta.env is not available.
firebase.initializeApp({
  apiKey: 'AIzaSyCPyZt5F2YCq8Ox_Eec1MJGog34D23JzA0',
  authDomain: 'nabha-rural-healthcare.firebaseapp.com',
  projectId: 'nabha-rural-healthcare',
  storageBucket: 'nabha-rural-healthcare.firebasestorage.app',
  messagingSenderId: '875810817064',
  appId: '1:875810817064:web:92d65252f6aaa057d3611d'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New Notification';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: payload.notification?.icon
  };

  self.registration.showNotification(title, options);
});
