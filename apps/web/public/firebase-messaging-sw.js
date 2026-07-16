importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
  measurementId: params.get("measurementId") || undefined,
};

if (
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Tino Expense";
    const options = {
      body: payload.notification?.body || payload.data?.message || "",
      data: payload.data || {},
      icon: "/images/tino-icon.png",
      badge: "/images/tino-icon.png",
    };

    self.registration.showNotification(title, options);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const walletId = event.notification.data?.wallet_id;
  const targetUrl = walletId ? `/wallets/${walletId}` : "/notifications";

  event.waitUntil(
    clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clientList) => {
        const origin = self.location.origin;

        for (const client of clientList) {
          if (client.url.startsWith(origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }

        return undefined;
      })
  );
});
