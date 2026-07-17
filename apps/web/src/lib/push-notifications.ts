import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { tinoApi } from "@/src/services/tino-api";
import { tinoApiSlice } from "@/src/store/tino-api-slice";
import type { AppDispatch } from "@/src/store/store";

const PUSH_DEVICE_ID_KEY = "tino-web-push-device-id";

let messagingPromise: Promise<Messaging | null> | null = null;
let foregroundListenerReady = false;

type WebPushRegisterResult = {
  reason?: string;
  registered: boolean;
};

function getFirebaseConfig(): FirebaseOptions | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (
    !config.apiKey ||
    !config.projectId ||
    !config.messagingSenderId ||
    !config.appId
  ) {
    console.warn("Web push skipped: Firebase web config is missing", {
      hasApiKey: Boolean(config.apiKey),
      hasProjectId: Boolean(config.projectId),
      hasMessagingSenderId: Boolean(config.messagingSenderId),
      hasAppId: Boolean(config.appId),
    });
    return null;
  }

  return config;
}

function getVapidKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY || "";
}

function getPushDeviceId() {
  const current = window.localStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (current) {
    return current;
  }

  const next = [
    "web",
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join("-");
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, next);
  return next;
}

function buildServiceWorkerUrl(config: FirebaseOptions) {
  const params = new URLSearchParams({
    apiKey: String(config.apiKey || ""),
    authDomain: String(config.authDomain || ""),
    projectId: String(config.projectId || ""),
    storageBucket: String(config.storageBucket || ""),
    messagingSenderId: String(config.messagingSenderId || ""),
    appId: String(config.appId || ""),
  });

  if (config.measurementId) {
    params.set("measurementId", String(config.measurementId));
  }

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

async function getWebMessaging() {
  if (messagingPromise) {
    return messagingPromise;
  }

  messagingPromise = (async () => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!("Notification" in window)) {
      console.warn("Web push skipped: Notification API is not available");
      return null;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("Web push skipped: Service Worker API is not available");
      return null;
    }

    if (!(await isSupported())) {
      console.warn("Web push skipped: Firebase Messaging is not supported");
      return null;
    }

    const config = getFirebaseConfig();

    if (!config) {
      return null;
    }

    const app = initializeApp(config);
    return getMessaging(app);
  })();

  return messagingPromise;
}

async function ensurePermission() {
  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("Web push skipped: notification permission was denied");
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    console.warn("Web push skipped: notification permission was not granted", {
      permission,
    });
  }

  return permission === "granted";
}

function subscribeForegroundMessages(
  messaging: Messaging,
  dispatch: AppDispatch
) {
  if (foregroundListenerReady) {
    return;
  }

  foregroundListenerReady = true;
  onMessage(messaging, (payload) => {
    dispatch(tinoApiSlice.util.invalidateTags(["Notifications"]));

    if (Notification.permission !== "granted") {
      return;
    }

    const title = payload.notification?.title || "Tino Expense";
    const body = payload.notification?.body || payload.data?.message || "";
    const walletId = payload.data?.wallet_id;
    const notification = new Notification(title, {
      body,
      icon: "/images/tino-icon.png",
      data: { wallet_id: walletId },
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = walletId ? `/wallets/${walletId}` : "/notifications";
    };
  });
}

export async function registerWebPushDevice(
  dispatch: AppDispatch
): Promise<WebPushRegisterResult> {
  const messaging = await getWebMessaging();
  const config = getFirebaseConfig();
  const vapidKey = getVapidKey();

  if (!messaging || !config || !vapidKey) {
    if (!vapidKey) {
      console.warn("Web push skipped: VAPID key is missing");
    }

    return { reason: "missing_config_or_vapid_key", registered: false };
  }

  if (!(await ensurePermission())) {
    return { reason: "permission_not_granted", registered: false };
  }

  const existingRegistration =
    await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");

  if (existingRegistration) {
    await existingRegistration.unregister();
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    buildServiceWorkerUrl(config)
  );
  const fcmToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!fcmToken) {
    console.warn("Web push skipped: Firebase returned an empty FCM token");
    return { reason: "empty_fcm_token", registered: false };
  }

  await tinoApi.registerPushDevice({
    device_id: getPushDeviceId(),
    platform: "web",
    fcm_token: fcmToken,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || null,
    device_name: navigator.userAgent,
  });
  subscribeForegroundMessages(messaging, dispatch);
  console.info("Web push device registered", {
    deviceId: getPushDeviceId(),
    origin: window.location.origin,
  });

  return { registered: true };
}

export async function unregisterCurrentWebPushDevice() {
  const deviceId = window.localStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (!deviceId) {
    return { revoked: 0 };
  }

  const response = await tinoApi.unregisterPushDevice(deviceId);
  return response.data ?? { revoked: 0 };
}
