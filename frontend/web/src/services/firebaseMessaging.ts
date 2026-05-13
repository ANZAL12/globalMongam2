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

  console.log('🔔 [Push] Starting web push token synchronization...');

  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.warn('🔔 [Push] Firebase messaging instance could not be initialized.');
      return;
    }
    
    if (!('Notification' in window)) {
      console.warn('🔔 [Push] This browser does not support desktop notifications.');
      return;
    }

    console.log('🔔 [Push] Current notification permission:', Notification.permission);

    if (Notification.permission === 'denied') {
      console.warn('🔔 [Push] Browser notification permission has been blocked by the user.');
      return;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    console.log('🔔 [Push] Permission result:', permission);

    if (permission !== 'granted') {
      console.warn('🔔 [Push] Notification permission was not granted.');
      return;
    }

    console.log('🔔 [Push] Registering service worker...');
    const serviceWorkerRegistration = await registerMessagingServiceWorker();
    if (!serviceWorkerRegistration) {
      console.error('🔔 [Push] Failed to register service worker.');
      return;
    }

    console.log('🔔 [Push] Fetching FCM token...');
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration,
    });

    if (!token) {
      console.error('🔔 [Push] No registration token available. Request permission to generate one.');
      return;
    }

    console.log('🔔 [Push] FCM Token generated successfully');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('🔔 [Push] No authenticated user found, skipping token sync.');
      return;
    }

    console.log('🔔 [Push] Updating user record in Supabase...');
    const { error } = await supabase
      .from('users')
      .update({ fcm_web_push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('🔔 [Push] Failed to save browser push token to database:', error);
    } else {
      console.log('🔔 [Push] Token successfully synced to database for user:', user.email);
    }
  } catch (error) {
    console.error('🔔 [Push] Failed to sync browser push token:', error);
  }
}

export async function startForegroundPushListener() {
  if (foregroundListenerStarted) return;
  foregroundListenerStarted = true;

  const messagingInstance = await getMessagingInstance();
  if (!messagingInstance) return;

  onMessage(messagingInstance, async (payload) => {
    console.log('🔔 [Push] Foreground message received:', payload);
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
    console.log('🔔 [Push] Foreground notification displayed');
  });
}

export async function sendAnnouncementPushViaFirebase({
  announcementId,
  targetUserIds,
}: {
  announcementId: string;
  targetUserIds: string[];
}) {
  const { data, error } = await supabase.functions.invoke('send-web-announcement-push', {
    body: {
      announcementId,
      targetIds: targetUserIds,
    },
  });

  if (error) throw error;
  return data;
}
