import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { supabase } from './supabase';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let tokenSyncStarted = false;
let foregroundListenerStarted = false;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey
  );
}

function getFirebaseMessagingConfigQuery() {
  const params = new URLSearchParams();
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

async function getMessagingInstance() {
  if (!hasFirebaseConfig()) {
    console.warn('Firebase web push is not configured. Add the VITE_FIREBASE_* values and VAPID key.');
    return null;
  }

  if (!(await isSupported())) {
    console.warn('Firebase messaging is not supported in this browser.');
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }

  return messaging;
}

async function registerMessagingServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  const query = getFirebaseMessagingConfigQuery();
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
}

export async function syncWebPushToken() {
  if (tokenSyncStarted) return;
  tokenSyncStarted = true;

  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance || !('Notification' in window)) return;

    if (Notification.permission === 'denied') {
      console.warn('Browser notification permission has been blocked.');
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') return;

    const serviceWorkerRegistration = await registerMessagingServiceWorker();
    if (!serviceWorkerRegistration) return;

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration,
    });

    if (!token) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ fcm_web_push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to save browser push token:', error);
    }
  } catch (error) {
    console.error('Failed to sync browser push token:', error);
  }
}

export async function startForegroundPushListener() {
  if (foregroundListenerStarted) return;
  foregroundListenerStarted = true;

  const messagingInstance = await getMessagingInstance();
  if (!messagingInstance) return;

  onMessage(messagingInstance, async (payload) => {
    const title = payload.notification?.title || 'New notification';
    const body = payload.notification?.body || '';
    const url = payload.data?.url || '/';

    if (Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/favicon.png',
      data: { url },
    });
  });
}
